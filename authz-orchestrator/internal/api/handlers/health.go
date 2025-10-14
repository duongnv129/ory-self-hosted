package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"github.com/ory-self-hosted/authz-orchestrator/internal/clients/keto"
	"github.com/ory-self-hosted/authz-orchestrator/internal/clients/opa"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	ketoClient *keto.Client
	opaClient  *opa.Client
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(ketoClient *keto.Client, opaClient *opa.Client) *HealthHandler {
	return &HealthHandler{
		ketoClient: ketoClient,
		opaClient:  opaClient,
	}
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status      string                 `json:"status"`
	Service     string                 `json:"service"`
	Version     string                 `json:"version"`
	Timestamp   time.Time              `json:"timestamp"`
	Dependencies map[string]interface{} `json:"dependencies"`
	Uptime      string                 `json:"uptime"`
}

var startTime = time.Now()

// Health handles GET /health
func (h *HealthHandler) Health(c *gin.Context) {
	status := "ok"
	dependencies := make(map[string]interface{})

	// Check Keto connectivity
	ketoStatus := "ok"
	if err := h.ketoClient.Health(c.Request.Context()); err != nil {
		log.Warn().Err(err).Msg("Keto health check failed")
		ketoStatus = "error"
		status = "degraded"
		dependencies["keto"] = map[string]interface{}{
			"status": ketoStatus,
			"error":  err.Error(),
		}
	} else {
		dependencies["keto"] = map[string]interface{}{
			"status": ketoStatus,
		}
	}

	// Check OPA connectivity
	opaStatus := "ok"
	if err := h.opaClient.Health(c.Request.Context()); err != nil {
		log.Warn().Err(err).Msg("OPA health check failed")
		opaStatus = "error"
		status = "degraded"
		dependencies["opa"] = map[string]interface{}{
			"status": opaStatus,
			"error":  err.Error(),
		}
	} else {
		dependencies["opa"] = map[string]interface{}{
			"status": opaStatus,
		}
	}

	response := HealthResponse{
		Status:       status,
		Service:      "authz-orchestrator",
		Version:      "1.0.0",
		Timestamp:    time.Now(),
		Dependencies: dependencies,
		Uptime:       time.Since(startTime).String(),
	}

	// Return appropriate HTTP status
	httpStatus := http.StatusOK
	if status == "degraded" {
		httpStatus = http.StatusPartialContent
	} else if status == "error" {
		httpStatus = http.StatusServiceUnavailable
	}

	c.JSON(httpStatus, response)
}

// Ready handles GET /health/ready
func (h *HealthHandler) Ready(c *gin.Context) {
	// Check if all dependencies are ready
	if err := h.ketoClient.Health(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not_ready",
			"reason": "keto_unavailable",
		})
		return
	}

	if err := h.opaClient.Health(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not_ready",
			"reason": "opa_unavailable",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// Live handles GET /health/live
func (h *HealthHandler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "alive",
		"uptime": time.Since(startTime).String(),
	})
}