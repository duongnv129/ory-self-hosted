package opa

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

// Client provides access to OPA policy engine
type Client struct {
	baseURL string
	client  *http.Client
}

// NewClient creates a new OPA client
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// PolicyInput represents the input to OPA policy evaluation
type PolicyInput struct {
	Subject         Subject                `json:"subject"`
	Resource        Resource               `json:"resource"`
	Action          string                 `json:"action"`
	Context         Context                `json:"context"`
	TenantConfig    map[string]interface{} `json:"tenant_config"`
	StructuralAllowed bool                 `json:"structural_allowed"`
}

// Subject represents the subject making the request
type Subject struct {
	ID         string                 `json:"id"`
	Clearance  int                    `json:"clearance"`
	Attributes map[string]interface{} `json:"attributes"`
}

// Resource represents the resource being accessed
type Resource struct {
	Type       string                 `json:"type"`
	Attributes map[string]interface{} `json:"attributes"`
}

// Context represents the request context
type Context struct {
	IP      string       `json:"ip,omitempty"`
	HourUTC int          `json:"hour_utc"`
	Risk    RiskContext  `json:"risk"`
	Session SessionContext `json:"session"`
}

// RiskContext represents risk assessment information
type RiskContext struct {
	Level string `json:"level"` // LOW, MED, HIGH
}

// SessionContext represents session information
type SessionContext struct {
	AAL int `json:"aal"` // Authentication Assurance Level
}

// PolicyDecision represents the result of OPA policy evaluation
type PolicyDecision struct {
	Allow       bool                   `json:"allow"`
	Reasons     []string               `json:"reasons"`
	RequiredAAL int                    `json:"required_aal"`
	SessionAAL  int                    `json:"session_aal"`
	Details     map[string]interface{} `json:"details,omitempty"`
}

// EvaluateRequest represents the OPA evaluation request
type EvaluateRequest struct {
	Input PolicyInput `json:"input"`
}

// EvaluateResponse represents the OPA evaluation response
type EvaluateResponse struct {
	Result PolicyDecision `json:"result"`
}

// Evaluate evaluates a policy decision using OPA
func (c *Client) Evaluate(ctx context.Context, input *PolicyInput) (*PolicyDecision, error) {
	log.Debug().
		Str("subject", input.Subject.ID).
		Str("action", input.Action).
		Str("resource_type", input.Resource.Type).
		Bool("structural_allowed", input.StructuralAllowed).
		Msg("Evaluating policy with OPA")

	// Build request
	reqBody := EvaluateRequest{Input: *input}
	reqJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Build request URL
	evalURL := fmt.Sprintf("%s/v1/data/authz/decision", c.baseURL)

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", evalURL, bytes.NewBuffer(reqJSON))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute request
	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OPA returned status %d", resp.StatusCode)
	}

	// Parse response
	var evalResp EvaluateResponse
	if err := json.NewDecoder(resp.Body).Decode(&evalResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	log.Debug().
		Bool("allow", evalResp.Result.Allow).
		Strs("reasons", evalResp.Result.Reasons).
		Int("required_aal", evalResp.Result.RequiredAAL).
		Msg("OPA evaluation result")

	return &evalResp.Result, nil
}

// Health checks the health of the OPA service
func (c *Client) Health(ctx context.Context) error {
	healthURL := fmt.Sprintf("%s/health", c.baseURL)

	httpReq, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create health request: %w", err)
	}

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to execute health request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("OPA health check failed with status: %d", resp.StatusCode)
	}

	return nil
}