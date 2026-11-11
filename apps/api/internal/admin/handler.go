package admin

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/auth"
	"github.com/raymondproguy/gracespring/apps/api/internal/platform/httpx"
)

type Handler struct{ store *Store }

func NewHandler(store *Store) *Handler { return &Handler{store: store} }

func (h *Handler) ChangeUserRole(w http.ResponseWriter, r *http.Request) {
	targetID, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil {
		httpx.WriteFieldErrors(w, http.StatusBadRequest, "validation_error", "The user ID is invalid", map[string]string{"user_id": "invalid_uuid"})
		return
	}
	var request struct {
		Role string `json:"role"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "bad_request", "Request body is invalid")
		return
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		httpx.WriteError(w, http.StatusBadRequest, "bad_request", "Request body must contain one JSON object")
		return
	}
	request.Role = strings.TrimSpace(request.Role)
	if request.Role != "member" && request.Role != "leader" && request.Role != "admin" {
		httpx.WriteFieldErrors(w, http.StatusBadRequest, "validation_error", "The role is invalid", map[string]string{"role": "invalid_role"})
		return
	}
	actorID, ok := auth.UserID(r.Context())
	if !ok {
		httpx.WriteError(w, http.StatusUnauthorized, "invalid_access_token", "Access token is invalid or expired")
		return
	}
	change, err := h.store.ChangeRole(r.Context(), actorID, targetID, request.Role)
	switch {
	case errors.Is(err, ErrProfileNotFound):
		httpx.WriteError(w, http.StatusNotFound, "profile_not_found", "The user profile was not found")
	case errors.Is(err, ErrLastAdmin):
		httpx.WriteError(w, http.StatusConflict, "last_admin", "The last administrator cannot be demoted")
	case err != nil:
		h.store.LogInternalError("change user role", err)
		httpx.WriteError(w, http.StatusServiceUnavailable, "role_update_unavailable", "Unable to update the user role")
	default:
		httpx.WriteData(w, http.StatusOK, change)
	}
}
