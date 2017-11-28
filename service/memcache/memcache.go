package memcache

import (
	"fmt"
	"log"

	"time"

	"github.com/bradfitz/gomemcache/memcache"
	"github.com/vjsamuel/water/service/common"
)

const all = "all"

type Memcache struct {
	client *memcache.Client
}

func NewMemcacheStorage(host, port string) *Memcache {
	client := memcache.New(fmt.Sprintf("%s:%s", host, port))

	return &Memcache{client: client}
}

func (m *Memcache) Get(holder common.Holder) (interface{}, error) {
	key := m.getRecordKey(holder)
	item, err := m.client.Get(key)

	if err != nil {
		log.Printf("Unable to get memcache key %s due to error %v\n", key, err)
		return nil, err
	}

	return item.Value, nil
}

func (m *Memcache) Insert(holder common.Holder) error {
	bytes, ok := holder.Object.([]byte)
	if !ok {
		return fmt.Errorf("Unable to convert interface to []byte\n")
	}
	key := m.getRecordKey(holder)
	item := &memcache.Item{
		Key:        key,
		Value:      bytes,
		Expiration: int32(time.Hour.Seconds()),
	}
	err := m.client.Set(item)
	if err != nil {
		log.Printf("Unable to update memcache key %s due to error %v\n", key, err)
	}
	return err
}

func (m *Memcache) Update(holder common.Holder) error {
	bytes, ok := holder.Object.([]byte)
	if !ok {
		return fmt.Errorf("Unable to convert interface to []byte")
	}
	key := m.getRecordKey(holder)
	item := &memcache.Item{
		Key:        key,
		Value:      bytes,
		Expiration: int32(time.Hour.Seconds()),
	}
	err := m.client.Replace(item)
	if err != nil {
		log.Printf("Unable to update memcache key %s due to error %v\n", key, err)
	}
	return err
}

func (m *Memcache) Delete(holder common.Holder) error {
	key := m.getRecordKey(holder)
	err := m.client.Delete(key)
	if err != nil {
		log.Printf("Unable to delete memcache key %s due to error %v\n", key, err)
	}
	return err
}

func (m *Memcache) Exists(holder common.Holder) bool {
	b, err := m.Get(holder)
	if err != nil || b == nil {
		return false
	}

	return true
}

func (m *Memcache) GetList(holder common.Holder) (interface{}, error) {
	id := all
	if holder.User.Profile != "" {
		id = fmt.Sprintf("%s/%s", id, all)
	}
	item, err := m.client.Get(id)

	if err != nil {
		log.Printf("Unable to get memcache key %s due to error %v\n", id, err)
		return nil, err
	}

	return item.Value, nil
}

func (m *Memcache) InsertList(holder common.Holder) error {
	id := all
	if holder.User.Profile != "" {
		id = fmt.Sprintf("%s/%s", id, all)
	}

	bytes, ok := holder.Object.([]byte)
	if !ok {
		return fmt.Errorf("Unable to convert interface to []byte\n")
	}

	item := &memcache.Item{
		Key:        id,
		Value:      bytes,
		Expiration: int32(time.Hour.Seconds()),
	}

	err := m.client.Set(item)
	if err != nil {
		log.Printf("Unable to insert memcache key %s due to error %v\n", id, err)
	}
	return err
}

func (m *Memcache) DeleteList(holder common.Holder) error {
	id := all
	if holder.User.Profile != "" {
		id = fmt.Sprintf("%s/%s", id, all)
	}

	err := m.client.Delete(id)
	if err != nil {
		log.Printf("Unable to delete memcache key %s due to error %v\n", id, err)
	}
	return err
}

func (m *Memcache) getRecordKey(holder common.Holder) string {
	return holder.GetFindingID()
}
