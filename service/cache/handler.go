package cache

import (
	"net/http"
)

func NoCacheHandler(handlerFunc http.HandlerFunc) http.HandlerFunc {
	h := http.HandlerFunc(handlerFunc)
	fn := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		h.ServeHTTP(w, r)
	}

	return fn
}
