package main

import (
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/vjsamuel/water/service/cache"
)

var users = cache.NewEvictableMap(100, time.Minute)

func main() {
	r := mux.NewRouter()

	fs := http.FileServer(http.Dir("."))
	r.Methods("GET").PathPrefix("/").Handler(fs)

	http.ListenAndServe(":8081", &CorsServer{r})
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
