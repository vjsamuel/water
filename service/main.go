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

	source := v1.PathPrefix("/source").Subrouter()
	source.Path("/{id}").Handler(a.AuthenticatedHandler(h.UpdateFinding)).Methods("PUT")
	source.Path("/{id}").Handler(a.AuthenticatedHandler(h.DeleteFinding)).Methods("DELETE")
	source.Path("/{id}").Handler(cache.NoCacheHandler(h.GetFindingInfo)	).Methods("GET")

	pages := v1.PathPrefix("/source/{id}").Subrouter()
	pages.Path("/image/{image}").HandlerFunc(h.GetImage).Methods("GET")
	r.Methods("GET").Path("/_ah/health").Handler(cache.NoCacheHandler(h.HealthCheck))

	//fs := http.FileServer(http.Dir("../webapp"))
	//r.Methods("GET").PathPrefix("/").Handler(fs)

	http.ListenAndServe(":8080", r)
}
