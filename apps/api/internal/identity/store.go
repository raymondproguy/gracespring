package identity

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/auth"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/dbgen"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/httpx"
)

type Store struct {
	queries *dbgen.Queries
	logger  *slog.Logger
}

func NewStore(pool *pgxpool.Pool, logger *slog.Logger) *Store {
	return &Store{queries: dbgen.New(pool), logger: logger}
}

func (s *Store) GetOrCreateRole(ctx context.Context, userID uuid.UUID) (string, error) {
	role, err := s.queries.GetProfileRole(ctx, userID)
	if err == nil {
		return role, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}
	if err := s.queries.CreateProfile(ctx, userID); err != nil {
		return "", err
	}
	return s.queries.GetProfileRole(ctx, userID)
}

type Profile struct {
	ID          uuid.UUID `json:"id"`
	Email       *string   `json:"email"`
	DisplayName string    `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url"`
	Bio         *string   `json:"bio"`
	Ministry    *string   `json:"ministry"`
	Role        string    `json:"role"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

func (s *Store) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserID(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing_auth_context", "Authentication is required")
		return
	}
	profile, err := s.queries.GetProfile(r.Context(), userID)
	if err != nil {
		s.logger.Error("load authenticated profile", "request_id", middleware.GetReqID(r.Context()), "error", err)
		httpx.WriteError(w, http.StatusServiceUnavailable, "profile_unavailable", "Unable to load your profile")
		return
	}
	httpx.WriteData(w, http.StatusOK, toProfileResponse(profile))
}

type patchProfileRequest struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	Ministry    *string `json:"ministry"`
}

func (s *Store) PatchMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserID(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "missing_auth_context", "Authentication is required")
		return
	}
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		httpx.WriteError(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json")
		return
	}

	var request patchProfileRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "bad_request", "Request body is invalid")
		return
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		httpx.WriteError(w, http.StatusBadRequest, "bad_request", "Request body must contain one JSON object")
		return
	}

	fields := make(map[string]string)
	displayName := normalize(request.DisplayName)
	bio := normalize(request.Bio)
	ministry := normalize(request.Ministry)
	validateField(fields, "display_name", displayName, 80, false)
	validateField(fields, "bio", bio, 160, true)
	validateField(fields, "ministry", ministry, 120, true)
	if len(fields) > 0 {
		httpx.WriteFieldErrors(w, http.StatusBadRequest, "validation_error", "One or more fields are invalid", fields)
		return
	}
	if displayName == nil && bio == nil && ministry == nil {
		httpx.WriteFieldErrors(w, http.StatusBadRequest, "validation_error", "At least one profile field is required", map[string]string{"body": "no_updatable_fields"})
		return
	}

	profile, err := s.queries.UpdateProfile(r.Context(), dbgen.UpdateProfileParams{
		ID:             userID,
		DisplayNameSet: displayName != nil,
		DisplayName:    displayName,
		BioSet:         bio != nil,
		Bio:            bio,
		MinistrySet:    ministry != nil,
		Ministry:       ministry,
	})
	if err != nil {
		s.logger.Error("update authenticated profile", "request_id", middleware.GetReqID(r.Context()), "error", err)
		httpx.WriteError(w, http.StatusServiceUnavailable, "profile_unavailable", "Unable to update your profile")
		return
	}
	httpx.WriteData(w, http.StatusOK, toProfileResponse(profile))
}

func (s *Store) SetAvatar(ctx context.Context, userID uuid.UUID, avatarURL string) (Profile, error) {
	profile, err := s.queries.UpdateProfileAvatar(ctx, dbgen.UpdateProfileAvatarParams{
		ID:        userID,
		AvatarUrl: &avatarURL,
	})
	if err != nil {
		return Profile{}, err
	}
	return toProfileResponse(profile), nil
}

func (s *Store) GetAvatar(ctx context.Context, userID uuid.UUID) (string, error) {
	profile, err := s.queries.GetProfile(ctx, userID)
	if err != nil {
		return "", err
	}
	if profile.AvatarUrl == nil {
		return "", nil
	}
	return *profile.AvatarUrl, nil
}

func normalize(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	return &trimmed
}

func validateField(fields map[string]string, name string, value *string, maxRunes int, allowEmpty bool) {
	if value == nil {
		return
	}
	if !allowEmpty && *value == "" {
		fields[name] = "required"
		return
	}
	if utf8.RuneCountInString(*value) > maxRunes {
		fields[name] = "too_long"
	}
}

func toProfileResponse(profile dbgen.Profile) Profile {
	return Profile{
		ID:          profile.ID,
		Email:       profile.Email,
		DisplayName: profile.DisplayName,
		AvatarURL:   profile.AvatarUrl,
		Bio:         profile.Bio,
		Ministry:    profile.Ministry,
		Role:        profile.Role,
		CreatedAt:   profile.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:   profile.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
