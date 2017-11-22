package storage

import "github.com/vjsamuel/water/service/common"

type Storage interface {
	Get(common.Holder) (interface{}, error)
	List(common.Holder) (interface{}, error)
	Insert(common.Holder) error
	Update(common.Holder) error
	Delete(common.Holder) error
	Exists(common.Holder) bool
}
