package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

var errInvalidToken = errors.New("invalid access token")

type claims struct {
	Subject  string `json:"sub"`
	IssuedAt int64  `json:"iat"`
	Expires  int64  `json:"exp"`
}

type tokenHeader struct {
	Algorithm string `json:"alg"`
}

func VerifyAccessToken(token string, secret []byte, now time.Time) (uuid.UUID, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return uuid.Nil, errInvalidToken
	}

	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return uuid.Nil, errInvalidToken
	}
	var header tokenHeader
	if json.Unmarshal(headerJSON, &header) != nil || header.Algorithm != "HS256" {
		return uuid.Nil, errInvalidToken
	}

	signed := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(signed))
	expected := mac.Sum(nil)
	provided, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(provided, expected) {
		return uuid.Nil, errInvalidToken
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return uuid.Nil, errInvalidToken
	}
	var tokenClaims claims
	if json.Unmarshal(claimsJSON, &tokenClaims) != nil || tokenClaims.Subject == "" || tokenClaims.IssuedAt <= 0 || tokenClaims.Expires <= tokenClaims.IssuedAt {
		return uuid.Nil, errInvalidToken
	}
	if tokenClaims.Expires <= now.Unix() || tokenClaims.IssuedAt > now.Add(time.Minute).Unix() {
		return uuid.Nil, errInvalidToken
	}

	userID, err := uuid.Parse(tokenClaims.Subject)
	if err != nil {
		return uuid.Nil, errInvalidToken
	}
	return userID, nil
}
