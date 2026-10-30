package identity

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

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

type profileResponse struct {
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
	response := profileResponse{
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
	httpx.WriteData(w, http.StatusOK, response)
}
