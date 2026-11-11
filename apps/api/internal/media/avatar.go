package media

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/raymondproguy/gracespring/apps/api/internal/identity"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/auth"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/httpx"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/storage"
)

const (
	avatarUploadLimit = 10 << 20
	maxAvatarSide     = 4096
	maxAvatarPixels   = 8_000_000
)

type AvatarProfileStore interface {
	GetAvatar(context.Context, uuid.UUID) (string, error)
	SetAvatar(context.Context, uuid.UUID, string) (identity.Profile, error)
}

type AvatarHandler struct {
	profiles AvatarProfileStore
	storage  storage.Store
	baseURL  string
	logger   *slog.Logger
}

func NewAvatarHandler(profiles AvatarProfileStore, store storage.Store, baseURL string, logger *slog.Logger) *AvatarHandler {
	return &AvatarHandler{profiles: profiles, storage: store, baseURL: strings.TrimRight(baseURL, "/"), logger: logger}
}

func (h *AvatarHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserID(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing_auth_context", "Authentication is required")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, avatarUploadLimit)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			httpx.WriteError(w, http.StatusRequestEntityTooLarge, "upload_too_large", "Avatar uploads must be 10 MB or smaller")
			return
		}
		httpx.WriteError(w, http.StatusBadRequest, "bad_request", "A multipart file field named file is required")
		return
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "bad_request", "A multipart file field named file is required")
		return
	}
	defer file.Close()

	encoded, contentType, extension, err := normalizeAvatar(file)
	if err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "invalid_avatar", err.Error())
		return
	}
	previousURL, err := h.profiles.GetAvatar(r.Context(), userID)
	if err != nil {
		h.logger.Error("load current profile avatar", "request_id", middleware.GetReqID(r.Context()), "error", err)
		httpx.WriteError(w, http.StatusServiceUnavailable, "profile_unavailable", "Unable to update your avatar")
		return
	}
	contentHash := sha256.Sum256(encoded)
	fileName := hex.EncodeToString(contentHash[:]) + extension
	key := filepath.ToSlash(filepath.Join("avatars", userID.String(), fileName))
	avatarURL, err := h.storage.Put(r.Context(), key, contentType, encoded)
	if err != nil {
		h.logger.Error("store avatar", "request_id", middleware.GetReqID(r.Context()), "error", err)
		httpx.WriteError(w, http.StatusInternalServerError, "upload_failed", "Unable to store avatar")
		return
	}

	profile, err := h.profiles.SetAvatar(r.Context(), userID, avatarURL)
	if err != nil {
		h.logger.Error("update profile avatar", "request_id", middleware.GetReqID(r.Context()), "error", err)
		httpx.WriteError(w, http.StatusServiceUnavailable, "profile_unavailable", "Unable to update your avatar")
		return
	}
	if previousKey, ok := h.objectKey(previousURL, userID); ok && previousURL != avatarURL {
		if err := h.storage.Delete(r.Context(), previousKey); err != nil {
			h.logger.Error("remove replaced avatar", "request_id", middleware.GetReqID(r.Context()), "error", err)
		}
	}
	httpx.WriteData(w, http.StatusOK, profile)
}

func (h *AvatarHandler) objectKey(avatarURL string, userID uuid.UUID) (string, bool) {
	prefix := h.baseURL + "/avatars/" + userID.String() + "/"
	if !strings.HasPrefix(avatarURL, prefix) {
		return "", false
	}
	name := strings.TrimPrefix(avatarURL, prefix)
	if filepath.Base(name) != name || strings.Contains(name, "/") {
		return "", false
	}
	extension := filepath.Ext(name)
	if extension != ".jpg" && extension != ".png" {
		return "", false
	}
	if _, err := hex.DecodeString(strings.TrimSuffix(name, extension)); err != nil || len(strings.TrimSuffix(name, extension)) != 64 {
		return "", false
	}
	return filepath.ToSlash(filepath.Join("avatars", userID.String(), name)), true
}

func normalizeAvatar(file multipart.File) ([]byte, string, string, error) {
	data, err := io.ReadAll(io.LimitReader(file, avatarUploadLimit+1))
	if err != nil {
		return nil, "", "", errors.New("Unable to read avatar")
	}
	if len(data) == 0 || len(data) > avatarUploadLimit {
		return nil, "", "", errors.New("Avatar uploads must be between 1 byte and 10 MB")
	}
	contentType := http.DetectContentType(data[:min(512, len(data))])
	if contentType != "image/jpeg" && contentType != "image/png" {
		return nil, "", "", errors.New("Avatar must be a JPEG or PNG image")
	}

	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || (format != "jpeg" && format != "png") || (format == "jpeg" && contentType != "image/jpeg") || (format == "png" && contentType != "image/png") {
		return nil, "", "", errors.New("Avatar image is invalid")
	}
	if config.Width < 1 || config.Height < 1 || config.Width > maxAvatarSide || config.Height > maxAvatarSide || int64(config.Width)*int64(config.Height) > maxAvatarPixels {
		return nil, "", "", errors.New("Avatar dimensions must be at most 4096 pixels per side and 8 million pixels total")
	}
	decoded, decodedFormat, err := image.Decode(bytes.NewReader(data))
	if err != nil || decodedFormat != format {
		return nil, "", "", errors.New("Avatar image is invalid")
	}

	var output bytes.Buffer
	if format == "jpeg" {
		err = jpeg.Encode(&output, decoded, &jpeg.Options{Quality: 88})
	} else {
		err = png.Encode(&output, decoded)
	}
	if err != nil {
		return nil, "", "", errors.New("Avatar image could not be processed")
	}
	if output.Len() > avatarUploadLimit {
		return nil, "", "", errors.New("Processed avatar exceeds the 10 MB upload limit")
	}
	extension := ".png"
	if format == "jpeg" {
		extension = ".jpg"
	}
	return output.Bytes(), contentType, extension, nil
}

func LocalMediaHandler(root string) http.Handler {
	absoluteRoot, err := filepath.Abs(root)
	if err != nil {
		return http.NotFoundHandler()
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := strings.TrimPrefix(r.URL.Path, "/media/")
		if key == "" || !filepath.IsLocal(key) {
			http.NotFound(w, r)
			return
		}
		path := filepath.Join(absoluteRoot, filepath.FromSlash(key))
		relative, err := filepath.Rel(absoluteRoot, path)
		if err != nil || !filepath.IsLocal(relative) {
			http.NotFound(w, r)
			return
		}
		info, err := os.Stat(path)
		if err != nil || !info.Mode().IsRegular() {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Content-Disposition", "inline")
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		http.ServeFile(w, r, path)
	})
}
