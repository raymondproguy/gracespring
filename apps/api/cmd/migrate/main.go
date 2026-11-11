package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/config"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	if len(os.Args) != 2 || (os.Args[1] != "up" && os.Args[1] != "status") {
		return fmt.Errorf("usage: go run ./cmd/migrate {up|status}")
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}
	database, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("could not configure PostgreSQL connection")
	}
	defer database.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("could not configure Goose PostgreSQL dialect")
	}

	ctx := context.Background()
	switch os.Args[1] {
	case "up":
		if err := goose.UpContext(ctx, database, "migrations"); err != nil {
			return fmt.Errorf("apply migrations: %w", err)
		}
	case "status":
		if err := goose.StatusContext(ctx, database, "migrations"); err != nil {
			return fmt.Errorf("read migration status: %w", err)
		}
	}
	return nil
}
