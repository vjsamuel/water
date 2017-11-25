package cache

import (
	"time"

	"github.com/bluele/gcache"
	"github.com/vjsamuel/water/service/common"
)

type EvictableMap struct {
	cache   gcache.Cache
	timeout time.Duration
}

func NewEvictableMap(size int, timeout time.Duration) *EvictableMap {
	gc := gcache.New(size).
		LRU().
		Build()

	return &EvictableMap{cache: gc, timeout: timeout}
}

func (e *EvictableMap) Insert(key string, value common.User) {
	e.cache.SetWithExpire(key, value, e.timeout)
}

func (e *EvictableMap) Get(key string) *common.User {
	uRaw, err := e.cache.GetIFPresent(key)
	if err != nil {
		return nil
	}

	if user, ok := uRaw.(common.User); ok {
		return &user
	}

	return nil
}
