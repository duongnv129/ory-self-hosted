package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"github.com/ory-self-hosted/authz-orchestrator/internal/models"
	"github.com/ory-self-hosted/authz-orchestrator/internal/services/decision"
)

// DecisionHandler handles authorization decision requests
type DecisionHandler struct {
	orchestrator *decision.Orchestrator
}

// NewDecisionHandler creates a new decision handler
func NewDecisionHandler(orchestrator *decision.Orchestrator) *DecisionHandler {
	return &DecisionHandler{
		orchestrator: orchestrator,
	}
}

// MakeDecision handles POST /decision requests
func (h *DecisionHandler) MakeDecision(c *gin.Context) {
	var req models.DecisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Warn().Err(err).Msg("Invalid decision request")
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Set tenant from header if not in request body
	if req.Tenant == "" {
		req.Tenant = c.GetHeader("X-Tenant-Id")
	}
	if req.Tenant == "" {
		req.Tenant = "default"
	}

	// Enrich context from headers
	if req.Context == nil {
		req.Context = make(map[string]interface{})
	}

	// Extract additional context from headers
	if userID := c.GetHeader("X-User-Id"); userID != "" {
		req.Subject = userID
	}
	if sessionAAL := c.GetHeader("X-Session-AAL"); sessionAAL != "" {
		req.Context["session_aal"] = sessionAAL
	}
	if ketoNamespace := c.GetHeader("X-Keto-Namespace"); ketoNamespace != "" {
		req.Context["keto_namespace"] = ketoNamespace
	}
	if clientIP := c.ClientIP(); clientIP != "" {
		req.Context["ip"] = clientIP
	}

	log.Info().
		Str("subject", req.Subject).
		Str("action", req.Action).
		Str("resource", req.Resource).
		Str("tenant", req.Tenant).
		Str("client_ip", c.ClientIP()).
		Msg("Processing authorization decision request")

	// Make decision
	decision, err := h.orchestrator.MakeDecision(c.Request.Context(), &req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to make decision")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "decision_failed",
			"message": "Failed to process authorization decision",
		})
		return
	}

	// Return decision
	c.JSON(http.StatusOK, decision)
}

// SimulateDecision handles POST /simulate requests for testing
func (h *DecisionHandler) SimulateDecision(c *gin.Context) {
	var req models.DecisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Add simulation flag to context
	if req.Context == nil {
		req.Context = make(map[string]interface{})
	}
	req.Context["simulation"] = true

	// Make decision
	decision, err := h.orchestrator.MakeDecision(c.Request.Context(), &req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to simulate decision")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "simulation_failed",
			"message": "Failed to simulate authorization decision",
		})
		return
	}

	// Return decision with simulation metadata
	response := gin.H{
		"decision":   decision,
		"simulation": true,
		"message":    "This is a simulated decision for testing purposes",
	}

	c.JSON(http.StatusOK, response)
}