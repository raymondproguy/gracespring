package admin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrProfileNotFound = errors.New("profile not found")
var ErrLastAdmin = errors.New("cannot demote the last administrator")

type Store struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

func NewStore(pool *pgxpool.Pool, logger *slog.Logger) *Store {
	return &Store{pool: pool, logger: logger}
}

type RoleChange struct {
	UserID uuid.UUID `json:"user_id"`
	Role   string    `json:"role"`
}

func (s *Store) ChangeRole(ctx context.Context, actorID, targetID uuid.UUID, role string) (RoleChange, error) {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return RoleChange{}, fmt.Errorf("begin role change: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", int64(712045991)); err != nil {
		return RoleChange{}, fmt.Errorf("lock role changes: %w", err)
	}

	var oldRole string
	err = tx.QueryRow(ctx, `SELECT role FROM profiles WHERE id = $1 FOR UPDATE`, targetID).Scan(&oldRole)
	if errors.Is(err, pgx.ErrNoRows) {
		return RoleChange{}, ErrProfileNotFound
	}
	if err != nil {
		return RoleChange{}, fmt.Errorf("read target role: %w", err)
	}
	if oldRole == role {
		if err := tx.Commit(ctx); err != nil {
			return RoleChange{}, fmt.Errorf("finish unchanged role: %w", err)
		}
		return RoleChange{UserID: targetID, Role: role}, nil
	}
	if oldRole == "admin" && role != "admin" {
		var admins int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM profiles WHERE role = 'admin'`).Scan(&admins); err != nil {
			return RoleChange{}, fmt.Errorf("count administrators: %w", err)
		}
		if admins <= 1 {
			return RoleChange{}, ErrLastAdmin
		}
	}
	if _, err := tx.Exec(ctx, `UPDATE profiles SET role = $2, updated_at = now() WHERE id = $1`, targetID, role); err != nil {
		return RoleChange{}, fmt.Errorf("update target role: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO admin_role_audit (actor_id, target_user_id, old_role, new_role, action) VALUES ($1, $2, $3, $4, 'role_changed')`, actorID, targetID, oldRole, role); err != nil {
		return RoleChange{}, fmt.Errorf("write role audit record: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return RoleChange{}, fmt.Errorf("commit role change: %w", err)
	}
	return RoleChange{UserID: targetID, Role: role}, nil
}

func (s *Store) SeedFirstAdmin(ctx context.Context, targetID uuid.UUID) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin first-admin seed: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", int64(712045991)); err != nil {
		return fmt.Errorf("lock role changes: %w", err)
	}
	var admins int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM profiles WHERE role = 'admin'`).Scan(&admins); err != nil {
		return fmt.Errorf("count administrators: %w", err)
	}
	if admins != 0 {
		return errors.New("an administrator already exists; first-admin seed is disabled")
	}
	var oldRole string
	err = tx.QueryRow(ctx, `SELECT role FROM profiles WHERE id = $1 FOR UPDATE`, targetID).Scan(&oldRole)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrProfileNotFound
	}
	if err != nil {
		return fmt.Errorf("read target role: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE profiles SET role = 'admin', updated_at = now() WHERE id = $1`, targetID); err != nil {
		return fmt.Errorf("promote initial administrator: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO admin_role_audit (target_user_id, old_role, new_role, action) VALUES ($1, $2, 'admin', 'first_admin_seeded')`, targetID, oldRole); err != nil {
		return fmt.Errorf("write seed audit record: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit first-admin seed: %w", err)
	}
	return nil
}

func (s *Store) LogInternalError(message string, err error) {
	s.logger.Error(message, "error", err)
}
