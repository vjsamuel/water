package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"cloud.google.com/go/datastore"
	"github.com/gorilla/mux"
	"github.com/sony/sonyflake"
	"github.com/vjsamuel/water/service/auth"
	"github.com/vjsamuel/water/service/cache"
	"github.com/vjsamuel/water/service/common"
	"github.com/vjsamuel/water/service/memcache"
	"github.com/vjsamuel/water/service/pubsub"
	"github.com/vjsamuel/water/service/storage"
	"github.com/vjsamuel/water/service/storage/entity"
	"github.com/vjsamuel/water/service/storage/object"
)

type handler struct {
	object storage.Storage
	entity storage.Storage
	psub   *pubsub.PubSub
	users  *cache.EvictableMap
	mcache *memcache.Memcache
	s      *sonyflake.Sonyflake
}

func NewHandler(users *cache.EvictableMap) *handler {
	projectId := os.Getenv("PROJECT_ID")
	bucket := os.Getenv("BUCKET")
	ctx := context.Background()

	o := object.NewObjectStorage(bucket, projectId, ctx)
	if o == nil {
		log.Fatal("Unable to create cloud storage client")
	}
	e := entity.NewEntityStorage(projectId, ctx)
	if e == nil {
		log.Fatal("Unable to create datastore client")
	}

	p := pubsub.NewPubSub(projectId, bucket, ctx)
	if p == nil {
		log.Fatal("Unable to create pubsub client")
	}

	host := os.Getenv("MEMCACHE_SERVICE_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("MEMCACHE_SERVICE_PORT")
	if port == "" {
		port = "11211"
	}

	mcache := memcache.NewMemcacheStorage(host, port)

	return &handler{object: o, users: users, entity: e, psub: p, mcache: mcache, s: sonyflake.NewSonyflake(sonyflake.Settings{})}
}

func (h *handler) GetFindings(w http.ResponseWriter, r *http.Request) {
	usr := h.getUserFromRequest(r)
	holder := common.Holder{}

	if usr != nil {
		holder.User = *usr
	}

	latStr := r.URL.Query().Get("lat")
	lngStr := r.URL.Query().Get("lng")

	var point *datastore.GeoPoint
	if latStr != "" && lngStr != "" {
		dontAdd := false
		lat, err := strconv.ParseFloat(latStr, 64)
		if err != nil {
			dontAdd = true
			log.Println(fmt.Errorf("latitude information is not a float: %v", err))
		}
		long, err := strconv.ParseFloat(lngStr, 64)
		if err != nil {
			dontAdd = true
			log.Println(fmt.Errorf("longitude information is not a float: %v", err))
		}

		if dontAdd == false {
			point = &datastore.GeoPoint{
				Lat: lat,
				Lng: long,
			}
		}
	}

	if point != nil && point.Valid() == false {
		point = nil
	}

	distStr := r.URL.Query().Get("dist")
	dist, err := strconv.ParseUint(distStr, 10, 64)
	if err != nil {
		dist = 0
	}

	if rawResp, _ := h.mcache.GetList(holder); rawResp != nil {
		bytes, _ := rawResp.([]byte)
		responses := []common.Response{}
		json.Unmarshal(bytes, &responses)

		responses = h.filterByDistance(responses, dist, point)
		bytes, _ = json.Marshal(responses)
		fmt.Fprintf(w, "%s", string(bytes))
		return
	}

	rawResp, err := h.entity.List(holder)
	if err != nil {
		http.Error(w, "Unable to process request", http.StatusInternalServerError)
		return
	}

	if rawResp == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	resp, _ := rawResp.([]common.Response)
	bytes, err := json.Marshal(resp)
	if err != nil {
		http.Error(w, "Unable to get file info", http.StatusInternalServerError)
		return
	}

	holder.Object = bytes
	h.mcache.InsertList(holder)

	resp = h.filterByDistance(resp, dist, point)
	bytes, _ = json.Marshal(resp)
	fmt.Fprintf(w, "%s", string(bytes))
}

func (h *handler) SubmitFinding(w http.ResponseWriter, r *http.Request) {
	usr := h.getUserFromRequest(r)
	if usr == nil {
		http.Error(w, "Unable to process request", http.StatusInternalServerError)
		return
	}

	lenStr := r.Header.Get("Content-Length")
	var err error
	var length int64
	if lenStr != "" {
		length, err = strconv.ParseInt(lenStr, 10, 64)
		if err != nil {
			http.Error(w, "Unable to process file", http.StatusInternalServerError)
			return
		}

		if length > 1024*1024*10 {
			http.Error(w, "File size exceeded 10 MB", http.StatusBadRequest)
		}

	}
	a, b, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Unable to upload submission", http.StatusInternalServerError)
		log.Printf("Unable to submission file due to error: %v\n", err)
		return
	}

	description := r.FormValue("description")
	comment := r.FormValue("comment")
	latlongStr := r.FormValue("location")

	point, err := h.getGeoPoint(w, latlongStr)
	if err != nil {
		log.Println(err)
		return
	}
	contentType := b.Header.Get("Content-Type")

	id, err := h.s.NextID()
	if err != nil {
		http.Error(w, "Unable to process submission", http.StatusInternalServerError)
		log.Printf("Unable to generate ID due to error: %v\n", err)
		return
	}

	holder := common.Holder{
		Id: fmt.Sprintf("%d", id),
		Image: common.Image{
			File:        fmt.Sprintf("%d-%s", id, b.Filename),
			ContentType: contentType,
			Size:        length,
		},
		User:        *usr,
		Object:      a,
		Description: description,
		Comment:     comment,
		Location:    *point,
	}

	err = h.psub.Publish(holder)
	if err != nil {
		http.Error(w, "Unable to process submission", http.StatusInternalServerError)
		return
	}
	a.Close()

	err = h.entity.Insert(holder)
	if err != nil {
		http.Error(w, "Unable to process submission", http.StatusInternalServerError)
		return
	}

	h.mcache.Delete(holder)
	h.mcache.DeleteList(holder)

	w.WriteHeader(http.StatusAccepted)
	fmt.Fprintf(w, "New submission with id %d submitted", id)
}

func (h *handler) UpdateFinding(w http.ResponseWriter, r *http.Request) {
	usr := h.getUserFromRequest(r)
	if usr == nil {
		http.Error(w, "Unable to process request", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	lenStr := r.Header.Get("Content-Length")
	var err error
	var length int64
	if lenStr != "" {
		length, err = strconv.ParseInt(lenStr, 10, 64)
		if err != nil {
			http.Error(w, "Unable to process file", http.StatusInternalServerError)
			return
		}

		if length > 1024*1024*10 {
			http.Error(w, "File size exceeded 10 MB", http.StatusBadRequest)
		}

	}
	a, b, err := r.FormFile("file")

	if err != nil {
		http.Error(w, "Unable to upload image", http.StatusInternalServerError)
		log.Printf("Unable to upload image due to error: %v\n", err)
		return
	}

	description := r.FormValue("description")
	comment := r.FormValue("comment")

	latlongStr := r.FormValue("location")

	point, err := h.getGeoPoint(w, latlongStr)
	if err != nil {
		log.Println(err)
		return
	}

	contentType := b.Header.Get("Content-Type")
	holder := common.Holder{
		Id:          id,
		User:        *usr,
		Object:      a,
		Description: description,
		Comment:     comment,
		Image: common.Image{
			File:        fmt.Sprintf("%s-%s", id, b.Filename),
			ContentType: contentType,
			Size:        length,
		},
		Location: *point,
	}
	if h.entity.Exists(holder) == false {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	err = h.psub.Publish(holder)
	if err != nil {
		http.Error(w, "Unable to process file", http.StatusInternalServerError)
		return
	}
	a.Close()

	err = h.entity.Update(holder)
	if err != nil {
		http.Error(w, "Unable to process file", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusAccepted)
	fmt.Fprintf(w, "%s uploaded", b.Filename)

	h.mcache.Delete(holder)
	h.mcache.DeleteList(holder)
}

func (h *handler) GetImage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	name := vars["image"]

	holder := common.Holder{
		Id: id,
		Image: common.Image{
			File: name,
		},
	}

	exists := h.object.Exists(holder)
	if !exists {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	rawReader, err := h.object.Get(holder)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Unable to get file. Please try again")
		return
	}

	if rawReader == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	reader, ok := rawReader.(io.ReadCloser)
	if !ok {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Unable to get file. Please try again")
		return
	}

	bytes, err := ioutil.ReadAll(reader)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Unable to get file. Please try again")
		return
	}
	w.Header().Add("Content-Length", fmt.Sprintf("%d", len(bytes)))
	w.Header().Add("Cache-Control", "s-maxage=3600, public")
	w.Write(bytes)
	reader.Close()
}

func (h *handler) GetFindingInfo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	holder := common.Holder{
		Id: id,
	}

	if rawResp, _ := h.mcache.Get(holder); rawResp != nil {
		bytes, _ := rawResp.([]byte)
		fmt.Fprintf(w, "%s", string(bytes))
		return
	}

	rawResp, err := h.entity.Get(holder)
	if err != nil {
		http.Error(w, "Unable to get finding info", http.StatusInternalServerError)
		return
	}

	if rawResp == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	resp, _ := rawResp.(common.Response)
	bytes, err := json.Marshal(resp)

	if err != nil {
		http.Error(w, "Unable to get file info", http.StatusInternalServerError)
		return
	}

	holder.Object = bytes
	h.mcache.Insert(holder)

	fmt.Fprintf(w, "%s", string(bytes))
}

func (h *handler) DeleteFinding(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	name := vars["id"]

	usr := h.getUserFromRequest(r)
	if usr == nil {
		http.Error(w, "Unable to process request", http.StatusInternalServerError)
		return
	}

	holder := common.Holder{
		Id:   name,
		User: *usr,
	}

	// Get list of images
	rawResp, err := h.entity.Get(holder)
	if err != nil {
		http.Error(w, "Unable to get finding info", http.StatusInternalServerError)
		return
	}

	if rawResp == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	resp, _ := rawResp.(common.Response)
	for k := range resp.Images {
		tempHolder := common.Holder{
			Id:   holder.Id,
			User: holder.User,
			Image: common.Image{
				File: k,
			},
		}
		err := h.object.Delete(tempHolder)
		if err != nil {
			log.Println("Unable to delete file. Please try again")
		}

	}

	err = h.entity.Delete(holder)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprint(w, "Unable to delete file metadata. Please try again")
		return
	}

	h.mcache.Delete(holder)
	h.mcache.DeleteList(holder)
	w.WriteHeader(http.StatusOK)
}

func (h *handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("ok"))
}

func (h *handler) getUserFromRequest(r *http.Request) *common.User {
	token := auth.GetAuthToken(r)
	return h.users.Get(token)
}

func (h *handler) getGeoPoint(w http.ResponseWriter, latlongStr string) (*datastore.GeoPoint, error) {
	if latlongStr == "" {
		http.Error(w, "Location is mandatory", http.StatusBadRequest)
		return nil, fmt.Errorf("location is a mandatory parameter")
	}

	latlong := strings.Split(latlongStr, ",")
	if len(latlong) != 2 {
		http.Error(w, "Latitude Longitude information is corrupt", http.StatusBadRequest)
		return nil, fmt.Errorf("latitude Longitude information is corrupt: %v", latlong)
	}

	lat, err := strconv.ParseFloat(latlong[0], 64)
	if err != nil {
		http.Error(w, "Latitude information is not a float", http.StatusBadRequest)
		return nil, fmt.Errorf("latitude information is not a float: %v", err)
	}
	long, err := strconv.ParseFloat(latlong[1], 64)
	if err != nil {
		http.Error(w, "Longitude information is not a float", http.StatusBadRequest)
		return nil, fmt.Errorf("longitude information is not a float: %v", err)
	}

	point := &datastore.GeoPoint{
		Lat: lat,
		Lng: long,
	}

	if point.Valid() == false {
		http.Error(w, "Geo information is invalid", http.StatusBadRequest)
		return nil, fmt.Errorf("geo information is invalid: %v", *point)
	}

	return point, nil
}

func (h *handler) filterByDistance(responses []common.Response, dist uint64, point *datastore.GeoPoint) []common.Response {
	if dist == 0 || point == nil {
		return responses
	}

	output := []common.Response{}
	for _, resp := range responses {
		fmt.Println(common.Distance(resp.Location, *point))
		if common.Distance(resp.Location, *point) <= float64(dist) {
			output = append(output, resp)
		}
	}

	return output
}
