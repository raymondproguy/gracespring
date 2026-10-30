package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/config"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/httpx"
)

func New(cfg config.Config, logger *slog.Logger, pool *pgxpool.Pool) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(httpx.Recoverer(logger))
	router.Use(httpx.AccessLog(logger))
	router.Use(httpx.CORS(cfg.AllowedOrigins))
	router.Use(middleware.Timeout(30 * time.Second))

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
		httpx.WriteData(w, http.StatusOK, map[string]string{"status": "ready"})
	})
	router.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteError(w, http.StatusNotFound, "not_found", "The requested resource was not found")
	})
	router.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		httpx.WriteError(w, http.StatusMethodNotAllowed, "method_not_allowed", "The method is not allowed for this resource")
	})

	return router
}
