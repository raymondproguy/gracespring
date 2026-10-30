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

-- name: UpdateProfile :one
UPDATE profiles
SET display_name = CASE
        WHEN sqlc.arg(display_name_set)::boolean THEN sqlc.narg(display_name)::text
        ELSE display_name
    END,
    bio = CASE
        WHEN sqlc.arg(bio_set)::boolean THEN NULLIF(sqlc.narg(bio)::text, '')
        ELSE bio
    END,
    ministry = CASE
        WHEN sqlc.arg(ministry_set)::boolean THEN NULLIF(sqlc.narg(ministry)::text, '')
        ELSE ministry
    END,
    updated_at = now()
WHERE id = sqlc.arg(id)
RETURNING id, email, display_name, avatar_url, bio, ministry, role, created_at, updated_at;
