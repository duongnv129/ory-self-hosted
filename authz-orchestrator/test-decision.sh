#!/bin/bash

# Simple test script for AuthZ Orchestrator decision endpoint

echo "Testing AuthZ Orchestrator..."

# Test 1: Health check
echo "1. Health check..."
curl -s http://localhost:8080/health | jq '.status' || echo "Service not running"

# Test 2: Basic decision request
echo "2. Basic decision request (should work with default config)..."
curl -X POST http://localhost:8080/decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user:alice@example.com",
    "action": "file.read",
    "resource": "file:test-doc",
    "tenant": "tenant-a",
    "context": {
      "hour_utc": 14,
      "classification": "public",
      "session_aal": 1
    }
  }' | jq '.'

# Test 3: Get tenant config
echo "3. Get tenant configuration..."
curl -s http://localhost:8080/policy/tenant/tenant-a/config | jq '.version' || echo "No config found"

# Test 4: Get policy templates
echo "4. Get policy templates..."
curl -s http://localhost:8080/policy/templates | jq '.count' || echo "No templates found"

echo "Testing complete!"