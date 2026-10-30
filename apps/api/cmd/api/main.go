package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/raymondproguy/gracespring/apps/api/internal/platform/config"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/db"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/logging"
	"github.com/raymondproguy/gracespring/apps/api/internal/server"
	"github.com/redis/go-redis/v9"
)

func main() {
	if err := run(); err != nil {
		slog.Error("API stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	logger := logging.New("info")
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger = logging.New(cfg.LogLevel)
	slog.SetDefault(logger)

	pool, err := db.NewPool(cfg.DatabaseURL, cfg.DBMaxConns)
	if err != nil {
		return err
	}
	defer pool.Close()

	redisOptions, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return errors.New("REDIS_URL is invalid")
	}
	redisClient := redis.NewClient(redisOptions)
	defer redisClient.Close()

	handler := server.New(cfg, logger, pool, redisClient)
	httpServer := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("API listening", "addr", cfg.HTTPAddr, "environment", cfg.AppEnv)
		serveErr <- httpServer.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shutdownCtx); err != nil {
			return err
		}
		logger.Info("API shut down cleanly")
	}

	return nil
}
