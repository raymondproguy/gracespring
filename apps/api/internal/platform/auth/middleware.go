package auth

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/httpx"
)

type ProfileLoader interface {
	GetOrCreateRole(context.Context, uuid.UUID) (string, error)
}

type principal struct {
	UserID uuid.UUID
	Role   string
}

type principalKey struct{}

func Middleware(secret string, profiles ProfileLoader, logger *slog.Logger) func(http.Handler) http.Handler {
	secretBytes := []byte(secret)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authorization := strings.Fields(r.Header.Get("Authorization"))
			if len(authorization) == 0 {
				httpx.WriteError(w, http.StatusUnauthorized, "missing_auth_header", "Authorization header is required")
				return
			}
			if len(authorization) != 2 || !strings.EqualFold(authorization[0], "Bearer") {
				httpx.WriteError(w, http.StatusUnauthorized, "invalid_access_token", "Access token is invalid or expired")
				return
			}

			userID, err := VerifyAccessToken(authorization[1], secretBytes, time.Now())
			if err != nil {
				httpx.WriteError(w, http.StatusUnauthorized, "invalid_access_token", "Access token is invalid or expired")
				return
			}

			role, err := profiles.GetOrCreateRole(r.Context(), userID)
			if err != nil {
				logger.Error("load profile for authenticated request", "request_id", middleware.GetReqID(r.Context()), "error", err)
				httpx.WriteError(w, http.StatusServiceUnavailable, "profile_unavailable", "Unable to load your profile")
				return
			}

			ctx := context.WithValue(r.Context(), principalKey{}, principal{UserID: userID, Role: role})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UserID(ctx context.Context) (uuid.UUID, bool) {
	value, ok := ctx.Value(principalKey{}).(principal)
	return value.UserID, ok
}

func UserRole(ctx context.Context) (string, bool) {
	value, ok := ctx.Value(principalKey{}).(principal)
	return value.Role, ok
}
