package entity_subscribe

import (
	"context"
	"fmt"
	"log"

	"cloud.google.com/go/datastore"
	"github.com/vjsamuel/water/service/common"
	s "github.com/vjsamuel/water/service/storage"
)

const (
	profile_kind = "Profile"
	subscribe_kind    = "Subscription"
)

type entityStore struct {
	projectId string
	client    *datastore.Client
	ctx       context.Context
}

func NewEntityStorage(projectId string, ctx context.Context) s.Storage {
	client, err := datastore.NewClient(ctx, projectId)
	if err != nil {
		log.Printf("Error instantiating object store client: %v", err)
		return nil
	}

	return &entityStore{client: client, projectId: projectId, ctx: ctx}
}

func (e *entityStore) Get(holder common.Holder) (interface{}, error) {
	parent := e.createAndGetParent(holder)
	if parent == nil {
		return nil, fmt.Errorf("Unable to get parent")
	}
	recordKey := datastore.NameKey(subscribe_kind, holder.GetProfileID(), parent)

	entity := common.Subscription{}
	err := e.client.Get(e.ctx, recordKey, &entity)
	if err != nil {
		log.Printf("Record get failed with error: %v", err)
		return nil, err

	}

	return entity, nil
}

func (e *entityStore) Insert(holder common.Holder) error {
	record := common.Subscription{
		Phone: holder.Phone,
	}
	return e.insertRecord(record, holder)
}

func (e *entityStore) Update(holder common.Holder) error {
	return fmt.Errorf("not implemented")
}

func (e *entityStore) Delete(holder common.Holder) error {
	parent := e.createAndGetParent(holder)
	if parent == nil {
		return fmt.Errorf("Unable to find user profile")
	}
	recordKey := datastore.NameKey(subscribe_kind, holder.GetProfileID(), parent)

	err := e.client.Delete(e.ctx, recordKey)
	if err != nil {
		log.Printf("Record get delete with error: %v", err)
	}
	return err
}

func (e *entityStore) Exists(holder common.Holder) bool {
	if entity, _ := e.Get(holder); entity != nil {
		return true
	}

	return false
}

func (e *entityStore) List(holder common.Holder) (interface{}, error) {
	query := datastore.NewQuery(subscribe_kind)
	responses := []common.Subscription{}
	_, err := e.client.GetAll(e.ctx, query, &responses)
	if err != nil {
		return nil, fmt.Errorf("query execution failed")
	}

	return responses, nil
}

func (e *entityStore) createAndGetParent(holder common.Holder) *datastore.Key {
	parent := datastore.NameKey(profile_kind, holder.GetProfileID(), nil)
	profile := common.Profile{}
	if err := e.client.Get(e.ctx, parent, &profile); err != nil {
		// Profile does not exist, create it
		profile = holder.GetProfile()
		_, err := e.client.Put(e.ctx, parent, &profile)
		if err != nil {
			log.Printf("Parent record insert failed with error: %v", err)
			return nil
		}
	}
	return parent
}

func (e *entityStore) insertRecord(record common.Subscription, holder common.Holder) error {
	parent := e.createAndGetParent(holder)
	if parent == nil {
		return fmt.Errorf("Unable to find user profile")
	}

	recordKey := datastore.NameKey(subscribe_kind, holder.GetProfileID(), parent)
	_, err := e.client.Put(e.ctx, recordKey, &record)
	if err != nil {
		log.Printf("Record insert failed with error: %v", err)
		return err
	}

	return nil
}
