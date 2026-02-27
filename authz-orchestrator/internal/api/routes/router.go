package routes

import (
	"github.com/gin-gonic/gin"

	"github.com/ory-self-hosted/authz-orchestrator/internal/api/handlers"
	"github.com/ory-self-hosted/authz-orchestrator/internal/api/middleware"
	"github.com/ory-self-hosted/authz-orchestrator/internal/clients/keto"
	"github.com/ory-self-hosted/authz-orchestrator/internal/clients/opa"
	"github.com/ory-self-hosted/authz-orchestrator/internal/services/decision"
	"github.com/ory-self-hosted/authz-orchestrator/internal/services/policy"
)

// NewRouter creates and configures the HTTP router
func NewRouter(decisionService *decision.Orchestrator, policyService *policy.Manager, ketoClient *keto.Client, opaClient *opa.Client) *gin.Engine {
	// Set Gin mode (could be configured)
	gin.SetMode(gin.ReleaseMode)

	router := gin.New()

	// Global middleware
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())

	// Initialize handlers
	decisionHandler := handlers.NewDecisionHandler(decisionService)
	policyHandler := handlers.NewPolicyHandler(policyService)
	healthHandler := handlers.NewHealthHandler(ketoClient, opaClient)

	// Health endpoints
	router.GET("/health", healthHandler.Health)
	router.GET("/health/ready", healthHandler.Ready)
	router.GET("/health/live", healthHandler.Live)

	// Core decision endpoint
	router.POST("/decision", decisionHandler.MakeDecision)
	router.POST("/simulate", decisionHandler.SimulateDecision)

	// Policy management endpoints
	policyGroup := router.Group("/policy")
	{
		// Template endpoints
		policyGroup.GET("/templates", policyHandler.GetPolicyTemplates)
		
		// Tenant management
		policyGroup.GET("/tenants", policyHandler.ListTenants)
		
		// Tenant-specific endpoints
		tenantGroup := policyGroup.Group("/tenant/:tenant")
		{
			tenantGroup.GET("/config", policyHandler.GetTenantConfig)
			tenantGroup.PUT("/draft", policyHandler.UpdateDraftConfig)
			tenantGroup.POST("/validate", policyHandler.ValidateConfig)
			tenantGroup.POST("/publish", policyHandler.PublishConfig)
			tenantGroup.DELETE("", policyHandler.DeleteTenantConfig)
		}
	}

	// Debug endpoints (could be conditional based on environment)
	debugGroup := router.Group("/debug")
	{
		debugGroup.GET("/routes", func(c *gin.Context) {
			routes := router.Routes()
			c.JSON(200, gin.H{
				"routes": routes,
				"count":  len(routes),
			})
		})
	}

	return router
}