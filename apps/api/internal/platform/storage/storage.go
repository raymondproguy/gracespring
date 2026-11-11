package storage

import "context"

type Store interface {
	Put(context.Context, string, string, []byte) (string, error)
	Delete(context.Context, string) error
}
