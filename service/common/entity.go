package common

import (
	"time"

	"cloud.google.com/go/datastore"
)

type Finding struct {
	Description string             `datastore:"description"`
	Comment     string             `datastore:"comment"`
	Location    datastore.GeoPoint `datastore:"location"`
	ID          string             `datastore:"id"`
}

type Profile struct {
	FirstName string `datastore:"first_name"`
	LastName  string `datastore:"last_name"`
}

type File struct {
	UploadTime   time.Time `datastore:"upload_time" json:"upload_time"`
	LastModified time.Time `datastore:"last_modified" json:"last_modified"`
	Version      int       `datastore:"version" json:"version"`
	Size         int64     `datastore:"size" json:"size"`
	Type         string    `datastore:"type" json:"type"`
}

type FindingHolder struct {
	Finding Finding
	Profile Profile
	File    File
}

type Response struct {
	Id          string             `json:"id"`
	Images      map[string]File    `json:"images"`
	Description string             `json:"description"`
	Comment     string             `json:"comment"`
	Location    datastore.GeoPoint `json:"location"`
}

type Subscription struct {
	Phone          string             `datastore:"phone" json:"phone"`
}