package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"

	"github.com/ory-self-hosted/authz-orchestrator/internal/models"
	"github.com/ory-self-hosted/authz-orchestrator/internal/services/policy"
)

// PolicyHandler handles policy configuration requests
type PolicyHandler struct {
	manager *policy.Manager
}

// NewPolicyHandler creates a new policy handler
func NewPolicyHandler(manager *policy.Manager) *PolicyHandler {
	return &PolicyHandler{
		manager: manager,
	}
}

// GetTenantConfig handles GET /policy/tenant/:tenant/config
func (h *PolicyHandler) GetTenantConfig(c *gin.Context) {
	tenantID := c.Param("tenant")
	
	config, err := h.manager.GetTenantConfig(tenantID)
	if err != nil {
		log.Warn().Err(err).Str("tenant", tenantID).Msg("Tenant config not found")
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "config_not_found",
			"message": "Tenant configuration not found",
			"tenant":  tenantID,
		})
		return
	}

	c.JSON(http.StatusOK, config)
}

// UpdateDraftConfig handles PUT /policy/tenant/:tenant/draft
func (h *PolicyHandler) UpdateDraftConfig(c *gin.Context) {
	tenantID := c.Param("tenant")
	
	var policyConfig models.PolicyConfig
	if err := c.ShouldBindJSON(&policyConfig); err != nil {
		log.Warn().Err(err).Str("tenant", tenantID).Msg("Invalid policy config")
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_config",
			"message": "Invalid policy configuration format",
			"details": err.Error(),
		})
		return
	}

	config, err := h.manager.UpdateDraftConfig(tenantID, &policyConfig)
	if err != nil {
		log.Error().Err(err).Str("tenant", tenantID).Msg("Failed to update draft config")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "update_failed",
			"message": "Failed to update draft configuration",
		})
		return
	}

	log.Info().Str("tenant", tenantID).Msg("Draft configuration updated")
	c.JSON(http.StatusOK, config)
}

// ValidateConfig handles POST /policy/tenant/:tenant/validate
func (h *PolicyHandler) ValidateConfig(c *gin.Context) {
	tenantID := c.Param("tenant")
	
	var policyConfig models.PolicyConfig
	if err := c.ShouldBindJSON(&policyConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_config",
			"message": "Invalid policy configuration format",
			"details": err.Error(),
		})
		return
	}

	validation := h.manager.ValidateConfig(&policyConfig)
	
	log.Debug().
		Str("tenant", tenantID).
		Bool("valid", validation.Valid).
		Int("errors", len(validation.Errors)).
		Int("warnings", len(validation.Warnings)).
		Msg("Policy configuration validated")

	c.JSON(http.StatusOK, validation)
}

// PublishConfig handles POST /policy/tenant/:tenant/publish
func (h *PolicyHandler) PublishConfig(c *gin.Context) {
	tenantID := c.Param("tenant")
	
	config, err := h.manager.PublishConfig(tenantID)
	if err != nil {
		log.Error().Err(err).Str("tenant", tenantID).Msg("Failed to publish config")
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "publish_failed",
			"message": err.Error(),
		})
		return
	}

	log.Info().Str("tenant", tenantID).Str("version", config.Version).Msg("Configuration published")
	c.JSON(http.StatusOK, gin.H{
		"message": "Configuration published successfully",
		"config":  config,
	})
}

// GetPolicyTemplates handles GET /policy/templates
func (h *PolicyHandler) GetPolicyTemplates(c *gin.Context) {
	templates := h.manager.GetPolicyTemplates()
	
	c.JSON(http.StatusOK, gin.H{
		"templates": templates,
		"count":     len(templates),
	})
}

// ListTenants handles GET /policy/tenants
func (h *PolicyHandler) ListTenants(c *gin.Context) {
	tenants, err := h.manager.ListTenants()
	if err != nil {
		log.Error().Err(err).Msg("Failed to list tenants")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "list_failed",
			"message": "Failed to retrieve tenant list",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tenants": tenants,
		"count":   len(tenants),
	})
}

// DeleteTenantConfig handles DELETE /policy/tenant/:tenant
func (h *PolicyHandler) DeleteTenantConfig(c *gin.Context) {
	tenantID := c.Param("tenant")
	
	if err := h.manager.DeleteTenantConfig(tenantID); err != nil {
		log.Error().Err(err).Str("tenant", tenantID).Msg("Failed to delete tenant config")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "delete_failed",
			"message": "Failed to delete tenant configuration",
		})
		return
	}

	log.Info().Str("tenant", tenantID).Msg("Tenant configuration deleted")
	c.JSON(http.StatusOK, gin.H{
		"message": "Tenant configuration deleted successfully",
		"tenant":  tenantID,
	})
}