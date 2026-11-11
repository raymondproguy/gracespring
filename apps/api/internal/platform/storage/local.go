package storage

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type LocalDisk struct {
	root    string
	baseURL string
}

func NewLocalDisk(root, baseURL string) (*LocalDisk, error) {
	if strings.TrimSpace(root) == "" {
		return nil, fmt.Errorf("MEDIA_PATH must not be empty")
	}
	if err := os.MkdirAll(root, 0o750); err != nil {
		return nil, fmt.Errorf("could not prepare media storage")
	}
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("could not resolve media storage path")
	}
	return &LocalDisk{root: absRoot, baseURL: strings.TrimRight(baseURL, "/")}, nil
}

func (s *LocalDisk) Put(ctx context.Context, key, _ string, data []byte) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	destination, err := s.pathFor(key)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(destination), 0o750); err != nil {
		return "", fmt.Errorf("could not prepare media directory")
	}
	temporary, err := os.CreateTemp(filepath.Dir(destination), ".upload-*")
	if err != nil {
		return "", fmt.Errorf("could not create media file")
	}
	temporaryName := temporary.Name()
	defer os.Remove(temporaryName)
	if err := temporary.Chmod(0o640); err != nil {
		_ = temporary.Close()
		return "", fmt.Errorf("could not set media file permissions")
	}
	if _, err := temporary.Write(data); err != nil {
		_ = temporary.Close()
		return "", fmt.Errorf("could not write media file")
	}
	if err := temporary.Sync(); err != nil {
		_ = temporary.Close()
		return "", fmt.Errorf("could not persist media file")
	}
	if err := temporary.Close(); err != nil {
		return "", fmt.Errorf("could not close media file")
	}
	if err := os.Rename(temporaryName, destination); err != nil {
		return "", fmt.Errorf("could not publish media file")
	}
	return s.baseURL + "/" + filepath.ToSlash(key), nil
}

func (s *LocalDisk) Delete(ctx context.Context, key string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	file, err := s.pathFor(key)
	if err != nil {
		return err
	}
	if err := os.Remove(file); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("could not remove media file")
	}
	return nil
}

func (s *LocalDisk) pathFor(key string) (string, error) {
	if !filepath.IsLocal(key) {
		return "", fmt.Errorf("invalid media key")
	}
	path := filepath.Join(s.root, filepath.FromSlash(key))
	relative, err := filepath.Rel(s.root, path)
	if err != nil || !filepath.IsLocal(relative) {
		return "", fmt.Errorf("invalid media key")
	}
	return path, nil
}
