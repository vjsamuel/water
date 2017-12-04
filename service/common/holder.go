package common

import "cloud.google.com/go/datastore"

type Holder struct {
	Id          string
	Image       Image
	User        User
	Description string
	Comment     string
	Location    datastore.GeoPoint
	Distance    int
	Object      interface{}
	Phone       string
}

type Image struct {
	File        string
	Size        int64
	ContentType string
}

func (h *Holder) GetFindingID() string {
	return h.Id
}

func (h *Holder) GetProfileID() string {
	return h.User.Profile
}

func (h *Holder) GetProfile() Profile {
	return Profile{
		FirstName: h.User.FirstName,
		LastName:  h.User.LastName,
	}
}
