-- +goose Up
CREATE TABLE admin_role_audit (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID,
    target_user_id UUID NOT NULL,
    old_role TEXT,
    new_role TEXT NOT NULL CHECK (new_role IN ('member', 'leader', 'admin')),
    action TEXT NOT NULL CHECK (action IN ('role_changed', 'first_admin_seeded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_role_audit_target_created_idx
    ON admin_role_audit (target_user_id, created_at DESC);

-- +goose Down
DROP TABLE admin_role_audit;
