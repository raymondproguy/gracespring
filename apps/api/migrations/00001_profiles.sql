-- +goose Up
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    display_name TEXT NOT NULL DEFAULT 'Member',
    avatar_url TEXT,
    bio TEXT,
    ministry TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_email_unique ON profiles (email) WHERE email IS NOT NULL;
