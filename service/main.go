package main

import (
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/vjsamuel/water/service/auth"
	"github.com/vjsamuel/water/service/cache"
	"github.com/vjsamuel/water/service/handler"
)

var users = cache.NewEvictableMap(100, time.Minute)

func main() {
	h := handler.NewHandler(users)
	a := auth.NewAuthHandler(users)

	r := mux.NewRouter()

	v1 := r.PathPrefix("/api/v1/water").Subrouter()
	v1.Path("/sources").Handler(cache.NoCacheHandler(h.GetFindings)).Methods("GET")
	v1.Path("/sources").Handler(a.AuthenticatedHandler(h.SubmitFinding)).Methods("POST")

	v1.Path("/subscribe").Handler(a.AuthenticatedHandler(h.Subscribe)).Methods("POST")
	v1.Path("/subscribe").Handler(a.AuthenticatedHandler(h.Unsubscribe)).Methods("DELETE")
	v1.Path("/subscribe").Handler(a.AuthenticatedHandler(h.Subscription)).Methods("GET")


	source := v1.PathPrefix("/source").Subrouter()
	source.Path("/{id}").Handler(a.AuthenticatedHandler(h.UpdateFinding)).Methods("PUT")
	source.Path("/{id}").Handler(a.AuthenticatedHandler(h.DeleteFinding)).Methods("DELETE")
	source.Path("/{id}").Handler(cache.NoCacheHandler(h.GetFindingInfo)).Methods("GET")

	pages := v1.PathPrefix("/source/{id}").Subrouter()
	pages.Path("/image/{image}").HandlerFunc(h.GetImage).Methods("GET")
	r.Methods("GET").Path("/_ah/health").Handler(cache.NoCacheHandler(h.HealthCheck))

	fs := http.FileServer(http.Dir("../webapp"))
	r.Methods("GET").PathPrefix("/").Handler(fs)

	http.ListenAndServe(":8080", &CorsServer{r})
}

type CorsServer struct {
	r *mux.Router
}

func (s *CorsServer) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	if origin := req.Header.Get("Origin"); origin != "" {
		rw.Header().Set("Access-Control-Allow-Origin", origin)
		rw.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		rw.Header().Set("Access-Control-Allow-Headers",
			"Accept, Content-Type, Content-Length, Accept-Encoding, X-CloudProject-Token, Authorization")
	}
	// Stop here if its Preflighted OPTIONS request
	if req.Method == "OPTIONS" {
		return
	}
	// Lets Gorilla work
	s.r.ServeHTTP(rw, req)
}
