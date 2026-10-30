-- name: GetProfileRole :one
SELECT role
FROM profiles
WHERE id = $1;

-- name: CreateProfile :exec
INSERT INTO profiles (id)
VALUES ($1)
ON CONFLICT (id) DO NOTHING;

-- name: GetProfile :one
SELECT id, email, display_name, avatar_url, bio, ministry, role, created_at, updated_at
FROM profiles
WHERE id = $1;
