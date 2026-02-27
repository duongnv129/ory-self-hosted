package keto

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/rs/zerolog/log"
)

// Client provides access to Keto authorization service
type Client struct {
	readURL  string
	writeURL string
	client   *http.Client
}

// NewClient creates a new Keto client
func NewClient(readURL, writeURL string) *Client {
	return &Client{
		readURL:  readURL,
		writeURL: writeURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// CheckRequest represents a relation tuple check request
type CheckRequest struct {
	Namespace string `json:"namespace"`
	Object    string `json:"object"`
	Relation  string `json:"relation"`
	SubjectID string `json:"subject_id"`
}

// CheckResponse represents a relation tuple check response
type CheckResponse struct {
	Allowed bool `json:"allowed"`
}

// RelationTuple represents a Keto relation tuple
type RelationTuple struct {
	Namespace string      `json:"namespace"`
	Object    string      `json:"object"`
	Relation  string      `json:"relation"`
	SubjectID string      `json:"subject_id,omitempty"`
	SubjectSet *SubjectSet `json:"subject_set,omitempty"`
}

// SubjectSet represents a subject set in Keto
type SubjectSet struct {
	Namespace string `json:"namespace"`
	Object    string `json:"object"`
	Relation  string `json:"relation"`
}

// CheckRelation checks if a relation exists in Keto
func (c *Client) CheckRelation(ctx context.Context, req *CheckRequest) (*CheckResponse, error) {
	log.Debug().
		Str("namespace", req.Namespace).
		Str("object", req.Object).
		Str("relation", req.Relation).
		Str("subject_id", req.SubjectID).
		Msg("Checking relation in Keto")

	// Build query parameters
	params := url.Values{}
	params.Set("namespace", req.Namespace)
	params.Set("object", req.Object)
	params.Set("relation", req.Relation)
	params.Set("subject_id", req.SubjectID)

	// Build request URL
	checkURL := fmt.Sprintf("%s/relation-tuples/check?%s", c.readURL, params.Encode())

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "GET", checkURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Execute request
	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var checkResp CheckResponse
	if err := json.NewDecoder(resp.Body).Decode(&checkResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	log.Debug().
		Bool("allowed", checkResp.Allowed).
		Msg("Keto check result")

	return &checkResp, nil
}

// ListRelations lists relation tuples for a namespace
func (c *Client) ListRelations(ctx context.Context, namespace string) ([]*RelationTuple, error) {
	log.Debug().
		Str("namespace", namespace).
		Msg("Listing relations from Keto")

	// Build query parameters
	params := url.Values{}
	params.Set("namespace", namespace)

	// Build request URL
	listURL := fmt.Sprintf("%s/relation-tuples?%s", c.readURL, params.Encode())

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "GET", listURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Execute request
	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var listResp struct {
		RelationTuples []*RelationTuple `json:"relation_tuples"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&listResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	log.Debug().
		Int("count", len(listResp.RelationTuples)).
		Msg("Retrieved relation tuples from Keto")

	return listResp.RelationTuples, nil
}

// Health checks the health of the Keto service
func (c *Client) Health(ctx context.Context) error {
	healthURL := fmt.Sprintf("%s/health/ready", c.readURL)

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
		return fmt.Errorf("keto health check failed with status: %d", resp.StatusCode)
	}

	return nil
}