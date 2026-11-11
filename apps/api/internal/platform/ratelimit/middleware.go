package ratelimit

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/auth"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/httpx"
	"github.com/redis/go-redis/v9"
)

const incrementWindow = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`

func IPMiddleware(client *redis.Client, logger *slog.Logger) func(http.Handler) http.Handler {
	script := redis.NewScript(incrementWindow)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			limit := int64(120)
			if isWrite(r.Method) {
				limit = 30
			}
			window := time.Now().Unix() / 60
			ip := clientIP(r)
			ipHash := sha256.Sum256([]byte(ip))
			ipKey := "gs:rate:ip:" + hex.EncodeToString(ipHash[:]) + ":" + strconv.FormatInt(window, 10)
			allowed, err := increment(r.Context(), script, client, ipKey, limit)
			if err != nil {
				logger.Error("Redis rate limit check failed", "request_id", middleware.GetReqID(r.Context()), "error", err)
				httpx.WriteError(w, http.StatusServiceUnavailable, "rate_limit_unavailable", "Service is temporarily unavailable")
				return
			}
			if !allowed {
				writeRateLimitError(w, limit)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func UserMiddleware(client *redis.Client, logger *slog.Logger) func(http.Handler) http.Handler {
	script := redis.NewScript(incrementWindow)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := auth.UserID(r.Context())
			if !ok {
				next.ServeHTTP(w, r)
				return
			}
			limit := int64(300)
			if isWrite(r.Method) {
				limit = 60
			}
			window := time.Now().Unix() / 60
			userKey := "gs:rate:user:" + userID.String() + ":" + strconv.FormatInt(window, 10)
			allowed, err := increment(r.Context(), script, client, userKey, limit)
			if err != nil {
				logger.Error("Redis rate limit check failed", "request_id", middleware.GetReqID(r.Context()), "error", err)
				httpx.WriteError(w, http.StatusServiceUnavailable, "rate_limit_unavailable", "Service is temporarily unavailable")
				return
			}
			if !allowed {
				writeRateLimitError(w, limit)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func increment(ctx context.Context, script *redis.Script, client *redis.Client, key string, limit int64) (bool, error) {
	count, err := script.Run(ctx, client, []string{key}, 120).Int64()
	if err != nil {
		return false, err
	}
	return count <= limit, nil
}

func clientIP(r *http.Request) string {
	if ip := middleware.GetClientIP(r.Context()); ip != "" {
		return ip
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil || ip == "" {
		return "unknown"
	}
	return ip
}

func isWrite(method string) bool {
	return method == http.MethodPost || method == http.MethodPut || method == http.MethodPatch || method == http.MethodDelete
}

func writeRateLimitError(w http.ResponseWriter, limit int64) {
	seconds := 60 - time.Now().Unix()%60
	w.Header().Set("Retry-After", strconv.FormatInt(seconds, 10))
	w.Header().Set("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
	httpx.WriteError(w, http.StatusTooManyRequests, "rate_limited", "Too many requests. Try again shortly.")
}
