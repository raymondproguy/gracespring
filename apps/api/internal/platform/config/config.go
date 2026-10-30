package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppEnv         string
	HTTPAddr       string
	LogLevel       string
	DatabaseURL    string
	RedisURL       string
	AuthJWTSecret  string
	MediaPath      string
	MediaBaseURL   string
	DBMaxConns     int32
	AllowedOrigins []string
}

func Load() (Config, error) {
	cfg := Config{
		AppEnv:        value("APP_ENV", "development"),
		HTTPAddr:      value("HTTP_ADDR", "127.0.0.1:8080"),
		LogLevel:      value("LOG_LEVEL", "info"),
		DatabaseURL:   strings.TrimSpace(os.Getenv("DATABASE_URL")),
		RedisURL:      strings.TrimSpace(value("REDIS_URL", "redis://localhost:6379/0")),
		AuthJWTSecret: strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET")),
		MediaPath:     value("MEDIA_PATH", "./data/media"),
		MediaBaseURL:  strings.TrimRight(value("MEDIA_BASE_URL", "http://127.0.0.1:8080/media"), "/"),
		AllowedOrigins: splitList(value(
			"ALLOWED_ORIGINS",
			"http://localhost:5173",
		)),
	}

	maxConns, err := strconv.ParseInt(value("DB_MAX_CONNS", "10"), 10, 32)
	if err != nil || maxConns < 1 {
		return Config{}, fmt.Errorf("DB_MAX_CONNS must be a positive integer")
	}
	cfg.DBMaxConns = int32(maxConns)

	if cfg.AppEnv != "development" && cfg.AppEnv != "test" && cfg.AppEnv != "production" {
		return Config{}, fmt.Errorf("APP_ENV must be development, test, or production")
	}
	if cfg.HTTPAddr == "" {
		return Config{}, fmt.Errorf("HTTP_ADDR must not be empty")
	}
	if cfg.LogLevel != "debug" && cfg.LogLevel != "info" && cfg.LogLevel != "warn" && cfg.LogLevel != "error" {
		return Config{}, fmt.Errorf("LOG_LEVEL must be debug, info, warn, or error")
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if err := validateDatabaseURL(cfg.DatabaseURL); err != nil {
		return Config{}, err
	}
	if err := validateOrigins(cfg.AllowedOrigins); err != nil {
		return Config{}, err
	}
	if err := validateRedisURL(cfg.RedisURL); err != nil {
		return Config{}, err
	}
	if len(cfg.AuthJWTSecret) < 32 {
		return Config{}, fmt.Errorf("AUTH_JWT_SECRET must contain at least 32 characters")
	}
	if err := validateMediaBaseURL(cfg.MediaBaseURL); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func validateMediaBaseURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return fmt.Errorf("MEDIA_BASE_URL must be an HTTP or HTTPS URL without a query or fragment")
	}
	return nil
}

func validateRedisURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "redis" && parsed.Scheme != "rediss") || parsed.Host == "" {
		return fmt.Errorf("REDIS_URL must be a valid Redis URL")
	}
	return nil
}

func validateOrigins(origins []string) error {
	for _, origin := range origins {
		parsed, err := url.Parse(origin)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" || parsed.User != nil || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" {
			return fmt.Errorf("ALLOWED_ORIGINS must contain comma-separated HTTP or HTTPS origins")
		}
	}
	return nil
}

func validateDatabaseURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "postgres" && parsed.Scheme != "postgresql") || parsed.Host == "" || parsed.Path == "/" {
		return fmt.Errorf("DATABASE_URL must be a valid PostgreSQL URL")
	}
	return nil
}

func value(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func splitList(value string) []string {
	var values []string
	for _, item := range strings.Split(value, ",") {
		if item = strings.TrimSpace(item); item != "" {
			values = append(values, item)
		}
	}
	return values
}
