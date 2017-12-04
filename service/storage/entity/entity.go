package entity

import (
	"context"
	"fmt"
	"log"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/vjsamuel/water/service/common"
	s "github.com/vjsamuel/water/service/storage"
)

const (
	finding_kind = "Finding"
	profile_kind = "Profile"
	file_kind    = "File"
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
	query := datastore.NewQuery(finding_kind).Filter("id =", holder.Id)
	responses, err := e.listByQuery(query)

	if len(responses) > 1 {
		return nil, fmt.Errorf("More than one response obtained")
	}

	if len(responses) == 0 {
		return nil, nil
	}

	return responses[0], err
}

func (e *entityStore) Insert(holder common.Holder) error {
	record := common.FindingHolder{
		File: common.File{
			Size:         holder.Image.Size,
			Type:         holder.Image.ContentType,
			Version:      1,
			LastModified: time.Now(),
			UploadTime:   time.Now(),
		},
		Finding: common.Finding{
			Description: holder.Description,
			Location:    holder.Location,
			Comment:     holder.Comment,
			ID:          holder.Id,
		},
		Profile: common.Profile{
			FirstName: holder.User.FirstName,
			LastName:  holder.User.LastName,
		},
	}

	return e.insertRecord(record, holder)
}

func (e *entityStore) Update(holder common.Holder) error {
	rawRecord, err := e.Get(holder)
	if err != nil {
		log.Printf("Unable to find entry to update due to error: %v\n", err)
		return fmt.Errorf("Unable to find entry to update")
	}

	record, _ := rawRecord.(common.Response)

	newRecord := common.FindingHolder{
		File: common.File{
			Size:         holder.Image.Size,
			Type:         holder.Image.ContentType,
			Version:      record.Images[holder.Image.File].Version + 1,
			LastModified: time.Now(),
			UploadTime:   record.Images[holder.Image.File].UploadTime,
		},
		Finding: common.Finding{
			Description: holder.Description,
			Location:    holder.Location,
			Comment:     holder.Comment,
			ID:          holder.Id,
		},
		Profile: common.Profile{
			FirstName: holder.User.FirstName,
			LastName:  holder.User.LastName,
		},
	}

	return e.insertRecord(newRecord, holder)
}

func (e *entityStore) Delete(holder common.Holder) error {
	parent := e.createAndGetParent(holder)
	if parent == nil {
		return fmt.Errorf("Unable to find user profile")
	}

	trans, err := e.client.NewTransaction(e.ctx)
	if err != nil {
		log.Printf("Unable to start transaction due to error: %v", err)
		return err
	}

	findingKey := datastore.NameKey(finding_kind, holder.GetFindingID(), parent)

	// Get list of all files for the given finding
	query := datastore.NewQuery(file_kind).Ancestor(findingKey).KeysOnly()
	keys, err := e.client.GetAll(e.ctx, query, nil)
	if err != nil {
		log.Printf("Unable to get all files of finding to delete due to error: %v", err)
		return err
	}
	// Delete all images associated with finding
	err = e.client.DeleteMulti(e.ctx, keys)
	if err != nil {
		trans.Rollback()
		log.Printf("Unable to get all files of finding to delete due to error: %v", err)
		return err
	}

	// Delete finding
	err = e.client.Delete(e.ctx, findingKey)
	if err != nil {
		trans.Rollback()
		log.Printf("Unable to get finding due to error: %v", err)
		return err
	}

	// Commit the transaction and return success.
	trans.Commit()
	return nil
}

func (e *entityStore) Exists(holder common.Holder) bool {
	if entity, _ := e.Get(holder); entity != nil {
		return true
	}

	return false
}

func (e *entityStore) List(holder common.Holder) (interface{}, error) {
	query := datastore.NewQuery(finding_kind)
	if holder.GetProfileID() != "" {
		parent := datastore.NameKey(profile_kind, holder.GetProfileID(), nil)
		query = query.Ancestor(parent)
	}

	responses, err := e.listByQuery(query)
	return responses, err
}

func (e *entityStore) listByQuery(query *datastore.Query) ([]common.Response, error) {
	entities := []common.Finding{}

	keys, err := e.client.GetAll(e.ctx, query, &entities)
	if err != nil {
		log.Printf("Record get failed with error: %v", err)
		return nil, err

	}

	responses := []common.Response{}
	for i := 0; i < len(keys); i++ {
		entity := entities[i]
		resp := common.Response{
			Id:          entity.ID,
			Description: entity.Description,
			Comment:     entity.Comment,
			Location:    entity.Location,
		}

		imgQuery := datastore.NewQuery(file_kind).Ancestor(keys[i])
		files := []common.File{}
		imgKeys, err := e.client.GetAll(e.ctx, imgQuery, &files)
		if err != nil {
			log.Printf("Record get failed with error: %v", err)
			continue

		}

		images := map[string]common.File{}
		for i := 0; i < len(imgKeys); i++ {
			images[imgKeys[i].Name] = files[i]
		}
		resp.Images = images
		responses = append(responses, resp)
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

func (e *entityStore) insertRecord(record common.FindingHolder, holder common.Holder) error {
	parent := e.createAndGetParent(holder)
	if parent == nil {
		return fmt.Errorf("Unable to find user profile")
	}
	trans, err := e.client.NewTransaction(e.ctx)
	if err != nil {
		log.Printf("Unable to start transaction due to error: %v", err)
		return err
	}

	findingKey := datastore.NameKey(finding_kind, holder.GetFindingID(), parent)
	_, err = trans.Put(findingKey, &record.Finding)
	if err != nil {
		trans.Rollback()
		log.Printf("Record insert failed with error: %v", err)
		return err
	}

	fileKey := datastore.NameKey(file_kind, holder.Image.File, findingKey)
	_, err = trans.Put(fileKey, &record.File)
	if err != nil {
		trans.Rollback()
		log.Printf("Record insert failed with error: %v", err)
		return err
	}
	trans.Commit()

	return nil
}