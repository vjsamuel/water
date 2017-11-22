package auth

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/vjsamuel/water/service/cache"
	"github.com/vjsamuel/water/service/common"
)

const AUTH_TOKEN = "X-CloudProject-Token"
const TOKEN_API = "https://www.googleapis.com/oauth2/v3/tokeninfo?id_token="

type AuthHandler struct {
	users *cache.EvictableMap
}

func NewAuthHandler(users *cache.EvictableMap) *AuthHandler {
	return &AuthHandler{users: users}
}

func (a *AuthHandler) AuthenticatedHandler(handlerFunc http.HandlerFunc) http.Handler {
	return a.checkAuthHeaders(http.HandlerFunc(handlerFunc))
}

func (a *AuthHandler) checkAuthHeaders(h http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		// Check for the auth header in the request
		token := GetAuthToken(r)
		if token != "" {
			if a.validateToken(token) {
				h.ServeHTTP(w, r)
			} else {
				http.Error(w, fmt.Sprintf("Invalid %s", AUTH_TOKEN), http.StatusForbidden)
			}
		} else {
			http.Error(w, fmt.Sprintf("%s needs to be passed with all requests", AUTH_TOKEN), http.StatusForbidden)
		}
	}

	return http.HandlerFunc(fn)
}

func GetAuthToken(r *http.Request) string {
	return r.Header.Get(AUTH_TOKEN)
}

func (a *AuthHandler) validateToken(token string) bool {
	if a.users.Get(token) != nil {
		return true
	}
	client := http.Client{
		Timeout: time.Second * 3,
	}

	resp, err := client.Get(fmt.Sprintf("%s%s", TOKEN_API, token))
	if err != nil {
		log.Println("Token validation failed with err: ", err)
		return false
	} else if resp.StatusCode == 200 {
		bytes, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Println("Response token read failed with err: ", err)
			return false
		}

		if len(bytes) != 0 {
			out := map[string]string{}
			err := json.Unmarshal(bytes, &out)

			if err != nil {
				log.Println("Response token parse failed with err: ", err)
				return false
			}

			first, _ := out["given_name"]
			last, _ := out["family_name"]
			prof, _ := out["sub"]
			u := common.User{
				FirstName: first,
				LastName:  last,
				Profile:   prof,
			}

			a.users.Insert(token, u)
			log.Println("Inserting user: ", u)
			return true
		}
	}
	return false
}
