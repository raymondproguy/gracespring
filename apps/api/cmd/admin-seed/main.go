package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/raymondproguy/gracespring/apps/api/internal/admin"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/config"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/db"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string) error {
	if len(args) != 1 {
		return fmt.Errorf("usage: go run ./cmd/admin-seed <signed-in-user-uuid>")
	}
	targetID, err := uuid.Parse(args[0])
	if err != nil {
		return fmt.Errorf("user ID must be a UUID")
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	pool, err := db.NewPool(cfg.DatabaseURL, cfg.DBMaxConns)
	if err != nil {
		return err
	}
	defer pool.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("could not connect to the application database")
	}
	if err := admin.NewStore(pool, slog.Default()).SeedFirstAdmin(ctx, targetID); err != nil {
		return err
	}
	fmt.Printf("Granted the initial admin role to %s\n", targetID)
	return nil
}
