package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/raymondproguy/gracespring/apps/api/internal/identity"
	"github.com/raymondproguy/gracespring/apps/api/internal/media"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/auth"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/config"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/httpx"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/ratelimit"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/storage"
	"github.com/redis/go-redis/v9"
)

func New(cfg config.Config, logger *slog.Logger, pool *pgxpool.Pool, redisClient *redis.Client, mediaStore storage.Store) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.ClientIPFromXFF("127.0.0.0/8", "::1/128"))
	router.Use(httpx.RequestID)
	router.Use(httpx.Recoverer(logger))
	router.Use(httpx.AccessLog(logger))
	router.Use(httpx.CORS(cfg.AllowedOrigins))
	router.Use(middleware.Timeout(30 * time.Second))

	profiles := identity.NewStore(pool, logger, cfg.CSAGAuthSchema)

	router.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteData(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	router.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			httpx.WriteError(w, http.StatusServiceUnavailable, "dependency_unavailable", "Service is not ready")
			return
		}
		if err := redisClient.Ping(ctx).Err(); err != nil {
			httpx.WriteError(w, http.StatusServiceUnavailable, "dependency_unavailable", "Service is not ready")
			return
		}
		if err := profiles.CheckEmailSource(ctx); err != nil {
			httpx.WriteError(w, http.StatusServiceUnavailable, "dependency_unavailable", "Service is not ready")
			return
		}
		httpx.WriteData(w, http.StatusOK, map[string]string{"status": "ready"})
	})
	if cfg.AppEnv != "production" {
		router.Handle("/media/*", media.LocalMediaHandler(cfg.MediaPath))
	}

	avatars := media.NewAvatarHandler(profiles, mediaStore, cfg.MediaBaseURL, logger)
	api := chi.NewRouter()
	api.Use(ratelimit.IPMiddleware(redisClient, logger))
	api.Group(func(protected chi.Router) {
		protected.Use(auth.Middleware(cfg.AuthJWTSecret, profiles, logger))
		protected.Use(ratelimit.UserMiddleware(redisClient, logger))
		protected.Get("/me", profiles.GetMe)
		protected.Patch("/me", profiles.PatchMe)
		protected.Put("/me/avatar", avatars.ServeHTTP)
	})
	api.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "The requested resource was not found")
	})
	api.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "The method is not allowed for this resource")
	})
	router.Mount("/v1", api)

	router.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "The requested resource was not found")
	})
	router.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "The method is not allowed for this resource")
	})

	return router
}
