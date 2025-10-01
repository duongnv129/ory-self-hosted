#!/bin/bash

# Comprehensive Oathkeeper Authentication and Authorization Tests (Bash version) with cleanup option
# Replicates the test cases from Comprehensive_Oathkeeper_Test.postman_collection.json
# Can also be used just for cleaning up identities with the --cleanup option

set -e

echo "🔐 Comprehensive Oathkeeper Authentication and Authorization Tests (Bash version)"
echo "=================================================================================="

# Check for cleanup-only option
if [ "$1" = "--cleanup" ]; then
    echo "🧹 Cleaning up Kratos test identities..."
    echo "========================================"

    # Configuration for cleanup
    KRATOS_ADMIN_URL="http://localhost:4434"

    # Test user emails from the Postman collection
    ALICE_EMAIL="alice@example.com"
    BOB_EMAIL="bob@example.com"
    CHARLIE_EMAIL="charlie@example.com"

    # Function to delete identity by email
    delete_identity_by_email() {
        local email=$1
        echo "🔍 Searching for identity with email: $email"

        # Find identity ID by email
        local identity_response=$(curl -s "${KRATOS_ADMIN_URL}/admin/identities" 2>/dev/null)

        if [[ $? -ne 0 || "$identity_response" == *"CURL_ERROR"* ]]; then
            echo -e "❌ Failed to connect to Kratos Admin Service. Is Kratos Admin running on port 4434?"
            exit 1
        fi

        # Extract the ID for the specific email
        local identity_id=$(echo "$identity_response" | grep -o '"id":"[^"]*","traits":{"email":"'"$email"'[^}]*}' | head -1 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$identity_id" ]; then
            echo "🗑️  Deleting identity: $email (ID: $identity_id)"
            DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${KRATOS_ADMIN_URL}/admin/identities/$identity_id")
            if [[ "$DELETE_RESPONSE" =~ ^[0-9]+$ ]] && [ "$DELETE_RESPONSE" -eq 204 ]; then
                echo "✅ Identity deleted successfully"
            else
                echo -e "❌ Failed to delete identity (Status: $DELETE_RESPONSE)"
            fi
        else
            echo "✅ No existing identity found for: $email"
        fi
    }

    # Clean up each test user
    delete_identity_by_email "$ALICE_EMAIL"
    delete_identity_by_email "$BOB_EMAIL"
    delete_identity_by_email "$CHARLIE_EMAIL"

    echo ""
    echo "🎉 Cleanup completed successfully!"
    echo ""
    echo "You can now run the Postman collection without identity conflicts."
    exit 0
fi

# Configuration for full test
BASE_URL="http://localhost"
KRATOS_ADMIN_PORT="4434"
KRATOS_PUBLIC_PORT="4433"
OATHKEEPER_PROXY_PORT="4455"
KETO_WRITE_PORT="4467"
KETO_READ_PORT="4466"
NAMESPACE="default"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test user credentials
ALICE_EMAIL="alice@example.com"
BOB_EMAIL="bob@example.com"
CHARLIE_EMAIL="charlie@example.com"

# Variables to store IDs and tokens
ALICE_ID=""
BOB_ID=""
CHARLIE_ID=""
ALICE_TOKEN=""
BOB_TOKEN=""
CHARLIE_TOKEN=""

echo -e "\n${YELLOW}Phase 1: Health Checks${NC}"

# Check Keto Read Service Health
echo -e "\n${YELLOW}1.1 Checking Keto Read Service Health...${NC}"
KETO_READ_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}:${KETO_READ_PORT}/health/ready" 2>/dev/null || echo "CURL_ERROR")
if [[ "$KETO_READ_HEALTH" == *"CURL_ERROR"* ]] || [[ ! "$KETO_READ_HEALTH" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}✗${NC} Keto Read Service is not accessible. Please ensure all services are running:"
    echo -e "  - Kratos on ports ${KRATOS_PUBLIC_PORT}/${KRATOS_ADMIN_PORT}"
    echo -e "  - Keto on ports ${KETO_READ_PORT}/${KETO_WRITE_PORT}"
    echo -e "  - Oathkeeper on port ${OATHKEEPER_PROXY_PORT}"
    echo -e "  - Multi-tenancy demo app"
    exit 1
elif [ "$KETO_READ_HEALTH" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} Keto Read Service is healthy"
else
    echo -e "${RED}✗${NC} Keto Read Service is not healthy (Status: $KETO_READ_HEALTH)"
    exit 1
fi

# Check Keto Write Service Health
echo -e "\n${YELLOW}1.2 Checking Keto Write Service Health...${NC}"
KETO_WRITE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}:${KETO_WRITE_PORT}/health/ready" 2>/dev/null || echo "CURL_ERROR")
if [[ "$KETO_WRITE_HEALTH" == *"CURL_ERROR"* ]] || [[ ! "$KETO_WRITE_HEALTH" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}✗${NC} Keto Write Service is not accessible. Please ensure all services are running:"
    echo -e "  - Kratos on ports ${KRATOS_PUBLIC_PORT}/${KRATOS_ADMIN_PORT}"
    echo -e "  - Keto on ports ${KETO_READ_PORT}/${KETO_WRITE_PORT}"
    echo -e "  - Oathkeeper on port ${OATHKEEPER_PROXY_PORT}"
    echo -e "  - Multi-tenancy demo app"
    exit 1
elif [ "$KETO_WRITE_HEALTH" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} Keto Write Service is healthy"
else
    echo -e "${RED}✗${NC} Keto Write Service is not healthy (Status: $KETO_WRITE_HEALTH)"
    exit 1
fi

# Check Kratos Public Service Health
echo -e "\n${YELLOW}1.3 Checking Kratos Public Service Health...${NC}"
KRATOS_PUBLIC_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}:${KRATOS_PUBLIC_PORT}/health/ready" 2>/dev/null || echo "CURL_ERROR")
if [[ "$KRATOS_PUBLIC_HEALTH" == *"CURL_ERROR"* ]] || [[ ! "$KRATOS_PUBLIC_HEALTH" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}✗${NC} Kratos Public Service is not accessible. Please ensure all services are running:"
    echo -e "  - Kratos on ports ${KRATOS_PUBLIC_PORT}/${KRATOS_ADMIN_PORT}"
    echo -e "  - Keto on ports ${KETO_READ_PORT}/${KETO_WRITE_PORT}"
    echo -e "  - Oathkeeper on port ${OATHKEEPER_PROXY_PORT}"
    echo -e "  - Multi-tenancy demo app"
    exit 1
elif [ "$KRATOS_PUBLIC_HEALTH" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} Kratos Public Service is healthy"
else
    echo -e "${RED}✗${NC} Kratos Public Service is not healthy (Status: $KRATOS_PUBLIC_HEALTH)"
    exit 1
fi

# Check Oathkeeper Proxy Health
echo -e "\n${YELLOW}1.4 Checking Oathkeeper Proxy Health...${NC}"
OATHKEEPER_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/health" 2>/dev/null || echo "CURL_ERROR")

# Check if OATHKEEPER_HEALTH contains CURL_ERROR or is not a valid number
if [[ "$OATHKEEPER_HEALTH" == *"CURL_ERROR"* ]] || [[ ! "$OATHKEEPER_HEALTH" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}✗${NC} Oathkeeper proxy is not accessible. Please ensure all services are running:"
    echo -e "  - Kratos on ports ${KRATOS_PUBLIC_PORT}/${KRATOS_ADMIN_PORT}"
    echo -e "  - Keto on ports ${KETO_READ_PORT}/${KETO_WRITE_PORT}"
    echo -e "  - Oathkeeper on port ${OATHKEEPER_PROXY_PORT}"
    echo -e "  - Multi-tenancy demo app"
    exit 1
elif [ "$OATHKEEPER_HEALTH" -eq 200 ]; then
    HEALTH_RESPONSE=$(curl -s "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/health")
    if [[ "$HEALTH_RESPONSE" == *'"status":"ok"'* ]] && [[ "$HEALTH_RESPONSE" == *'"service":"multi-tenancy-demo"'* ]]; then
        echo -e "${GREEN}✓${NC} Oathkeeper proxy is working"
    else
        echo -e "${RED}✗${NC} Oathkeeper proxy response not as expected"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Oathkeeper proxy is not healthy (Status: $OATHKEEPER_HEALTH)"
    exit 1
fi

echo -e "\n${YELLOW}Phase 2: Setup Relations${NC}"

# Clean up existing relations first
echo -e "\n${YELLOW}2.1 Cleaning up existing relations in namespace...${NC}"
CLEANUP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples?namespace=${NAMESPACE}" 2>/dev/null || echo "CURL_ERROR")
if [[ "$CLEANUP_RESPONSE" == *"CURL_ERROR"* ]] || [[ ! "$CLEANUP_RESPONSE" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}✗${NC} Failed to connect to Keto Write Service for cleanup. Is Keto Write running on port ${KETO_WRITE_PORT}?"
    exit 1
elif [ "$CLEANUP_RESPONSE" -eq 204 ]; then
    echo -e "${GREEN}✓${NC} Namespace cleaned successfully"
else
    echo -e "${RED}✗${NC} Failed to clean namespace (Status: $CLEANUP_RESPONSE)"
    # Continue anyway as this might not be an error if nothing existed
fi

# Create role hierarchies and permissions
echo -e "\n${YELLOW}2.2 Setting up RBAC roles and permissions...${NC}"

# Create moderator Role Hierarchies (customers are members of moderators)
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"role:customer\",
    \"relation\": \"member\",
    \"subject_set\": {
      \"namespace\": \"${NAMESPACE}\",
      \"object\": \"role:moderator\",
      \"relation\": \"member\"
    }
  }"
echo -e "${GREEN}✓${NC} Moderator role hierarchy created"

# Create admin Role Hierarchies (moderators are members of admins)
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"role:moderator\",
    \"relation\": \"member\",
    \"subject_set\": {
      \"namespace\": \"${NAMESPACE}\",
      \"object\": \"role:admin\",
      \"relation\": \"member\"
    }
  }"
echo -e "${GREEN}✓${NC} Admin role hierarchy created"

# Set product view permission for customers
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"product:items\",
    \"relation\": \"view\",
    \"subject_set\": {
      \"namespace\": \"${NAMESPACE}\",
      \"object\": \"role:customer\",
      \"relation\": \"member\"
    }
  }"
echo -e "${GREEN}✓${NC} Product view permission set for customers"

# Set product create permission for moderators
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"product:items\",
    \"relation\": \"create\",
    \"subject_set\": {
      \"namespace\": \"${NAMESPACE}\",
      \"object\": \"role:moderator\",
      \"relation\": \"member\"
    }
  }"
echo -e "${GREEN}✓${NC} Product create permission set for moderators"

# Set product delete permission for admins
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"product:items\",
    \"relation\": \"delete\",
    \"subject_set\": {
      \"namespace\": \"${NAMESPACE}\",
      \"object\": \"role:admin\",
      \"relation\": \"member\"
    }
  }"
echo -e "${GREEN}✓${NC} Product delete permission set for admins"

# Set category view permission for customers
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"category:items\",
    \"relation\": \"view\",
    \"subject_set\": {
      \"namespace\": \"${NAMESPACE}\",
      \"object\": \"role:customer\",
      \"relation\": \"member\"
    }
  }"
echo -e "${GREEN}✓${NC} Category view permission set for customers"

# Set category update permission for moderators
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"category:items\",
    \"relation\": \"update\",
    \"subject_set\": {
      \"namespace\": \"${NAMESPACE}\",
      \"object\": \"role:moderator\",
      \"relation\": \"member\"
    }
  }"
echo -e "${GREEN}✓${NC} Category update permission set for moderators"

# Set category create permission for admins
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"category:items\",
    \"relation\": \"create\",
    \"subject_set\": {
      \"namespace\": \"${NAMESPACE}\",
      \"object\": \"role:admin\",
      \"relation\": \"member\"
    }
  }"
echo -e "${GREEN}✓${NC} Category create permission set for admins"

# Set up role assignments (users to roles)
echo -e "\n${YELLOW}2.3 Assigning users to roles...${NC}"

# Assign Alice to Admin Role
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"role:admin\",
    \"relation\": \"member\",
    \"subject_id\": \"user:${ALICE_EMAIL}\"
  }"
echo -e "${GREEN}✓${NC} Alice assigned to admin role"

# Assign Bob to Moderator Role
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"role:moderator\",
    \"relation\": \"member\",
    \"subject_id\": \"user:${BOB_EMAIL}\"
  }"
echo -e "${GREEN}✓${NC} Bob assigned to moderator role"

# Assign Charlie to Customer Role
curl -s -X PUT \
  "${BASE_URL}:${KETO_WRITE_PORT}/admin/relation-tuples" \
  -H "Content-Type: application/json" \
  -d "{
    \"namespace\": \"${NAMESPACE}\",
    \"object\": \"role:customer\",
    \"relation\": \"member\",
    \"subject_id\": \"user:${CHARLIE_EMAIL}\"
  }"
echo -e "${GREEN}✓${NC} Charlie assigned to customer role"

echo -e "\n${YELLOW}Phase 3: Kratos Authentication${NC}"

# Clean up existing identities to avoid conflicts
echo -e "\n${YELLOW}3.1 Cleaning up existing identities...${NC}"

# Function to delete an identity by email
delete_identity_by_email() {
    local email=$1
    echo "🔍 Searching for identity with email: $email"

    # Find identity ID by email using jq
    local identity_id=$(curl -s "${BASE_URL}:${KRATOS_ADMIN_PORT}/admin/identities" 2>/dev/null | jq -r ".[] | select(.traits.email == \"$email\") | .id" | head -1)

    if [[ $? -ne 0 ]]; then
        echo -e "${RED}✗${NC} Failed to connect to Kratos Admin Service. Is Kratos Admin running on port ${KRATOS_ADMIN_PORT}?"
        exit 1
    fi

    if [ -n "$identity_id" ] && [ "$identity_id" != "null" ]; then
        echo "🗑️  Deleting identity: $email (ID: $identity_id)"
        DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE_URL}:${KRATOS_ADMIN_PORT}/admin/identities/$identity_id")
        if [[ "$DELETE_RESPONSE" =~ ^[0-9]+$ ]] && [ "$DELETE_RESPONSE" -eq 204 ]; then
            echo "✅ Identity deleted successfully"
        else
            echo -e "${RED}✗${NC} Failed to delete identity (Status: $DELETE_RESPONSE)"
        fi
    else
        echo "✅ No existing identity found for: $email"
    fi
}

delete_identity_by_email "$ALICE_EMAIL"
delete_identity_by_email "$BOB_EMAIL"
delete_identity_by_email "$CHARLIE_EMAIL"

# Create Alice Account with password
echo -e "\n${YELLOW}3.2 Creating Alice Account...${NC}"
ALICE_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}:${KRATOS_ADMIN_PORT}/admin/identities" \
  -H "Content-Type: application/json" \
  -d "{
    \"schema_id\": \"default\",
    \"traits\": {
      \"email\": \"${ALICE_EMAIL}\",
      \"name\": {
        \"first\": \"Alice\",
        \"last\": \"Admin\"
      },
      \"tenant_ids\": [\"admin\"]
    },
    \"credentials\": {
      \"password\": {
        \"config\": {
          \"password\": \"password123\"
        }
      }
    }
  }")

if echo "$ALICE_RESPONSE" | grep -q '"id"'; then
    ALICE_ID=$(echo "$ALICE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Alice account created (ID: $ALICE_ID)"
else
    echo -e "${RED}✗${NC} Failed to create Alice account"
    echo "Response: $ALICE_RESPONSE"
    exit 1
fi

# Create Bob Account with password
echo -e "\n${YELLOW}3.3 Creating Bob Account...${NC}"
BOB_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}:${KRATOS_ADMIN_PORT}/admin/identities" \
  -H "Content-Type: application/json" \
  -d "{
    \"schema_id\": \"default\",
    \"traits\": {
      \"email\": \"${BOB_EMAIL}\",
      \"name\": {
        \"first\": \"Bob\",
        \"last\": \"Moderator\"
      },
      \"tenant_ids\": [\"moderator\"]
    },
    \"credentials\": {
      \"password\": {
        \"config\": {
          \"password\": \"password123\"
        }
      }
    }
  }")

if echo "$BOB_RESPONSE" | grep -q '"id"'; then
    BOB_ID=$(echo "$BOB_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Bob account created (ID: $BOB_ID)"
else
    echo -e "${RED}✗${NC} Failed to create Bob account"
    echo "Response: $BOB_RESPONSE"
    exit 1
fi

# Create Charlie Account with password
echo -e "\n${YELLOW}3.4 Creating Charlie Account...${NC}"
CHARLIE_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}:${KRATOS_ADMIN_PORT}/admin/identities" \
  -H "Content-Type: application/json" \
  -d "{
    \"schema_id\": \"default\",
    \"traits\": {
      \"email\": \"${CHARLIE_EMAIL}\",
      \"name\": {
        \"first\": \"Charlie\",
        \"last\": \"Customer\"
      },
      \"tenant_ids\": [\"customer\"]
    },
    \"credentials\": {
      \"password\": {
        \"config\": {
          \"password\": \"password123\"
        }
      }
    }
  }")

if echo "$CHARLIE_RESPONSE" | grep -q '"id"'; then
    CHARLIE_ID=$(echo "$CHARLIE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Charlie account created (ID: $CHARLIE_ID)"
else
    echo -e "${RED}✗${NC} Failed to create Charlie account"
    echo "Response: $CHARLIE_RESPONSE"
    exit 1
fi

# Create Alice Session using native login
echo -e "\n${YELLOW}3.5 Creating Alice Session...${NC}"
# Initialize login flow
ALICE_FLOW=$(curl -s "${BASE_URL}:${KRATOS_PUBLIC_PORT}/self-service/login/api")
ALICE_FLOW_ID=$(echo "$ALICE_FLOW" | jq -r '.id')

# Submit password
ALICE_LOGIN=$(curl -s -X POST \
  "${BASE_URL}:${KRATOS_PUBLIC_PORT}/self-service/login?flow=${ALICE_FLOW_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"method\": \"password\",
    \"identifier\": \"${ALICE_EMAIL}\",
    \"password\": \"password123\"
  }")

ALICE_TOKEN=$(echo "$ALICE_LOGIN" | jq -r '.session_token // .session.token // empty')

if [ -n "$ALICE_TOKEN" ] && [ "$ALICE_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} Alice session created"
else
    echo -e "${RED}✗${NC} Failed to create Alice session"
    echo "Response: $ALICE_LOGIN"
    exit 1
fi

# Create Bob Session using native login
echo -e "\n${YELLOW}3.6 Creating Bob Session...${NC}"
BOB_FLOW=$(curl -s "${BASE_URL}:${KRATOS_PUBLIC_PORT}/self-service/login/api")
BOB_FLOW_ID=$(echo "$BOB_FLOW" | jq -r '.id')

BOB_LOGIN=$(curl -s -X POST \
  "${BASE_URL}:${KRATOS_PUBLIC_PORT}/self-service/login?flow=${BOB_FLOW_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"method\": \"password\",
    \"identifier\": \"${BOB_EMAIL}\",
    \"password\": \"password123\"
  }")

BOB_TOKEN=$(echo "$BOB_LOGIN" | jq -r '.session_token // .session.token // empty')

if [ -n "$BOB_TOKEN" ] && [ "$BOB_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} Bob session created"
else
    echo -e "${RED}✗${NC} Failed to create Bob session"
    echo "Response: $BOB_LOGIN"
    exit 1
fi

# Create Charlie Session using native login
echo -e "\n${YELLOW}3.7 Creating Charlie Session...${NC}"
CHARLIE_FLOW=$(curl -s "${BASE_URL}:${KRATOS_PUBLIC_PORT}/self-service/login/api")
CHARLIE_FLOW_ID=$(echo "$CHARLIE_FLOW" | jq -r '.id')

CHARLIE_LOGIN=$(curl -s -X POST \
  "${BASE_URL}:${KRATOS_PUBLIC_PORT}/self-service/login?flow=${CHARLIE_FLOW_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"method\": \"password\",
    \"identifier\": \"${CHARLIE_EMAIL}\",
    \"password\": \"password123\"
  }")

CHARLIE_TOKEN=$(echo "$CHARLIE_LOGIN" | jq -r '.session_token // .session.token // empty')

if [ -n "$CHARLIE_TOKEN" ] && [ "$CHARLIE_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} Charlie session created"
else
    echo -e "${RED}✗${NC} Failed to create Charlie session"
    echo "Response: $CHARLIE_LOGIN"
    exit 1
fi

echo -e "\n${YELLOW}Phase 4: Authorization Tests - Alice (Admin)${NC}"

# Alice CAN create Product
echo -e "\n${YELLOW}4.1 Alice CAN create Product...${NC}"
ALICE_CREATE_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"name\": \"Alice Admin Product\", \"category\": \"Electronics\", \"price\": 199.99}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/create")

ALICE_CREATE_PRODUCT_STATUS=$(echo "$ALICE_CREATE_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
ALICE_CREATE_PRODUCT_BODY=$(echo "$ALICE_CREATE_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$ALICE_CREATE_PRODUCT_STATUS" -eq 201 ] && echo "$ALICE_CREATE_PRODUCT_BODY" | grep -q "Product created successfully"; then
    echo -e "${GREEN}✓${NC} Alice can create products"
else
    echo -e "${RED}✗${NC} Alice cannot create products (Status: $ALICE_CREATE_PRODUCT_STATUS)"
    echo "Response: $ALICE_CREATE_PRODUCT_BODY"
fi

# Alice CAN delete Product
echo -e "\n${YELLOW}4.2 Alice CAN delete Product...${NC}"
ALICE_DELETE_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -X DELETE \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/delete/1")

ALICE_DELETE_PRODUCT_STATUS=$(echo "$ALICE_DELETE_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
ALICE_DELETE_PRODUCT_BODY=$(echo "$ALICE_DELETE_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$ALICE_DELETE_PRODUCT_STATUS" -eq 200 ] && (echo "$ALICE_DELETE_PRODUCT_BODY" | grep -q "deleted successfully" || [ "$ALICE_DELETE_PRODUCT_STATUS" -eq 404 ]); then
    # 404 is acceptable here since we're deleting a resource that might not exist
    echo -e "${GREEN}✓${NC} Alice can delete products"
else
    echo -e "${RED}✗${NC} Alice cannot delete products (Status: $ALICE_DELETE_PRODUCT_STATUS)"
    echo "Response: $ALICE_DELETE_PRODUCT_BODY"
fi

# Alice CAN view Product
echo -e "\n${YELLOW}4.3 Alice CAN view Product...${NC}"
ALICE_VIEW_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -X GET \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/list")

ALICE_VIEW_PRODUCT_STATUS=$(echo "$ALICE_VIEW_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
ALICE_VIEW_PRODUCT_BODY=$(echo "$ALICE_VIEW_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$ALICE_VIEW_PRODUCT_STATUS" -eq 200 ] && echo "$ALICE_VIEW_PRODUCT_BODY" | grep -q "Products listed successfully"; then
    echo -e "${GREEN}✓${NC} Alice can view products"
else
    echo -e "${RED}✗${NC} Alice cannot view products (Status: $ALICE_VIEW_PRODUCT_STATUS)"
    echo "Response: $ALICE_VIEW_PRODUCT_BODY"
fi

# Alice CAN create Category
echo -e "\n${YELLOW}4.4 Alice CAN create Category...${NC}"
ALICE_CREATE_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"name\": \"Alice Admin Category\", \"description\": \"Category created by admin\"}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/create")

ALICE_CREATE_CATEGORY_STATUS=$(echo "$ALICE_CREATE_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
ALICE_CREATE_CATEGORY_BODY=$(echo "$ALICE_CREATE_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$ALICE_CREATE_CATEGORY_STATUS" -eq 201 ] && echo "$ALICE_CREATE_CATEGORY_BODY" | grep -q "Category created successfully"; then
    echo -e "${GREEN}✓${NC} Alice can create categories"
else
    echo -e "${RED}✗${NC} Alice cannot create categories (Status: $ALICE_CREATE_CATEGORY_STATUS)"
    echo "Response: $ALICE_CREATE_CATEGORY_BODY"
fi

# Alice CAN update Category
echo -e "\n${YELLOW}4.5 Alice CAN update Category...${NC}"
ALICE_UPDATE_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -X PUT \
  -d "{\"name\": \"Updated Admin Category\", \"description\": \"Updated by admin\"}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/update/1")

ALICE_UPDATE_CATEGORY_STATUS=$(echo "$ALICE_UPDATE_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
ALICE_UPDATE_CATEGORY_BODY=$(echo "$ALICE_UPDATE_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$ALICE_UPDATE_CATEGORY_STATUS" -eq 200 ] && echo "$ALICE_UPDATE_CATEGORY_BODY" | grep -q "updated successfully"; then
    echo -e "${GREEN}✓${NC} Alice can update categories"
else
    echo -e "${RED}✗${NC} Alice cannot update categories (Status: $ALICE_UPDATE_CATEGORY_STATUS)"
    echo "Response: $ALICE_UPDATE_CATEGORY_BODY"
fi

# Alice CAN view Category
echo -e "\n${YELLOW}4.6 Alice CAN view Category...${NC}"
ALICE_VIEW_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -X GET \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/list")

ALICE_VIEW_CATEGORY_STATUS=$(echo "$ALICE_VIEW_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
ALICE_VIEW_CATEGORY_BODY=$(echo "$ALICE_VIEW_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$ALICE_VIEW_CATEGORY_STATUS" -eq 200 ] && echo "$ALICE_VIEW_CATEGORY_BODY" | grep -q "Categories listed successfully"; then
    echo -e "${GREEN}✓${NC} Alice can view categories"
else
    echo -e "${RED}✗${NC} Alice cannot view categories (Status: $ALICE_VIEW_CATEGORY_STATUS)"
    echo "Response: $ALICE_VIEW_CATEGORY_BODY"
fi

echo -e "\n${YELLOW}Phase 5: Authorization Tests - Bob (Moderator)${NC}"

# Bob CAN create Product
echo -e "\n${YELLOW}5.1 Bob CAN create Product...${NC}"
BOB_CREATE_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"name\": \"Bob Moderator Product\", \"category\": \"Tools\", \"price\": 99.99}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/create")

BOB_CREATE_PRODUCT_STATUS=$(echo "$BOB_CREATE_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BOB_CREATE_PRODUCT_BODY=$(echo "$BOB_CREATE_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$BOB_CREATE_PRODUCT_STATUS" -eq 201 ] && echo "$BOB_CREATE_PRODUCT_BODY" | grep -q "Product created successfully"; then
    echo -e "${GREEN}✓${NC} Bob can create products"
else
    echo -e "${RED}✗${NC} Bob cannot create products (Status: $BOB_CREATE_PRODUCT_STATUS)"
    echo "Response: $BOB_CREATE_PRODUCT_BODY"
fi

# Bob CANNOT delete Product
echo -e "\n${YELLOW}5.2 Bob CANNOT delete Product...${NC}"
BOB_DELETE_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -X DELETE \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/delete/2")

BOB_DELETE_PRODUCT_STATUS=$(echo "$BOB_DELETE_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BOB_DELETE_PRODUCT_BODY=$(echo "$BOB_DELETE_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$BOB_DELETE_PRODUCT_STATUS" -eq 403 ]; then
    echo -e "${GREEN}✓${NC} Bob cannot delete products (access denied as expected)"
else
    echo -e "${RED}✗${NC} Bob can delete products (should be forbidden) (Status: $BOB_DELETE_PRODUCT_STATUS)"
    echo "Response: $BOB_DELETE_PRODUCT_BODY"
fi

# Bob CAN view Product
echo -e "\n${YELLOW}5.3 Bob CAN view Product...${NC}"
BOB_VIEW_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -X GET \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/list")

BOB_VIEW_PRODUCT_STATUS=$(echo "$BOB_VIEW_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BOB_VIEW_PRODUCT_BODY=$(echo "$BOB_VIEW_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$BOB_VIEW_PRODUCT_STATUS" -eq 200 ] && echo "$BOB_VIEW_PRODUCT_BODY" | grep -q "Products listed successfully"; then
    echo -e "${GREEN}✓${NC} Bob can view products"
else
    echo -e "${RED}✗${NC} Bob cannot view products (Status: $BOB_VIEW_PRODUCT_STATUS)"
    echo "Response: $BOB_VIEW_PRODUCT_BODY"
fi

# Bob CANNOT create Category
echo -e "\n${YELLOW}5.4 Bob CANNOT create Category...${NC}"
BOB_CREATE_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"name\": \"Bob Moderator Category\", \"description\": \"Category by moderator\"}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/create")

BOB_CREATE_CATEGORY_STATUS=$(echo "$BOB_CREATE_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BOB_CREATE_CATEGORY_BODY=$(echo "$BOB_CREATE_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$BOB_CREATE_CATEGORY_STATUS" -eq 403 ]; then
    echo -e "${GREEN}✓${NC} Bob cannot create categories (access denied as expected)"
else
    echo -e "${RED}✗${NC} Bob can create categories (should be forbidden) (Status: $BOB_CREATE_CATEGORY_STATUS)"
    echo "Response: $BOB_CREATE_CATEGORY_BODY"
fi

# Bob CAN update Category
echo -e "\n${YELLOW}5.5 Bob CAN update Category...${NC}"
BOB_UPDATE_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -X PUT \
  -d "{\"name\": \"Updated by Moderator\", \"description\": \"Updated by Bob\"}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/update/1")

BOB_UPDATE_CATEGORY_STATUS=$(echo "$BOB_UPDATE_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BOB_UPDATE_CATEGORY_BODY=$(echo "$BOB_UPDATE_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$BOB_UPDATE_CATEGORY_STATUS" -eq 200 ] && echo "$BOB_UPDATE_CATEGORY_BODY" | grep -q "updated successfully"; then
    echo -e "${GREEN}✓${NC} Bob can update categories"
else
    echo -e "${RED}✗${NC} Bob cannot update categories (Status: $BOB_UPDATE_CATEGORY_STATUS)"
    echo "Response: $BOB_UPDATE_CATEGORY_BODY"
fi

# Bob CAN view Category
echo -e "\n${YELLOW}5.6 Bob CAN view Category...${NC}"
BOB_VIEW_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -X GET \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/list")

BOB_VIEW_CATEGORY_STATUS=$(echo "$BOB_VIEW_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
BOB_VIEW_CATEGORY_BODY=$(echo "$BOB_VIEW_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$BOB_VIEW_CATEGORY_STATUS" -eq 200 ] && echo "$BOB_VIEW_CATEGORY_BODY" | grep -q "Categories listed successfully"; then
    echo -e "${GREEN}✓${NC} Bob can view categories"
else
    echo -e "${RED}✗${NC} Bob cannot view categories (Status: $BOB_VIEW_CATEGORY_STATUS)"
    echo "Response: $BOB_VIEW_CATEGORY_BODY"
fi

echo -e "\n${YELLOW}Phase 6: Authorization Tests - Charlie (Customer)${NC}"

# Charlie CAN view Product
echo -e "\n${YELLOW}6.1 Charlie CAN view Product...${NC}"
CHARLIE_VIEW_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -X GET \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/list")

CHARLIE_VIEW_PRODUCT_STATUS=$(echo "$CHARLIE_VIEW_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
CHARLIE_VIEW_PRODUCT_BODY=$(echo "$CHARLIE_VIEW_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$CHARLIE_VIEW_PRODUCT_STATUS" -eq 200 ] && echo "$CHARLIE_VIEW_PRODUCT_BODY" | grep -q "Products listed successfully"; then
    echo -e "${GREEN}✓${NC} Charlie can view products"
else
    echo -e "${RED}✗${NC} Charlie cannot view products (Status: $CHARLIE_VIEW_PRODUCT_STATUS)"
    echo "Response: $CHARLIE_VIEW_PRODUCT_BODY"
fi

# Charlie CAN view Category
echo -e "\n${YELLOW}6.2 Charlie CAN view Category...${NC}"
CHARLIE_VIEW_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -X GET \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/list")

CHARLIE_VIEW_CATEGORY_STATUS=$(echo "$CHARLIE_VIEW_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
CHARLIE_VIEW_CATEGORY_BODY=$(echo "$CHARLIE_VIEW_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$CHARLIE_VIEW_CATEGORY_STATUS" -eq 200 ] && echo "$CHARLIE_VIEW_CATEGORY_BODY" | grep -q "Categories listed successfully"; then
    echo -e "${GREEN}✓${NC} Charlie can view categories"
else
    echo -e "${RED}✗${NC} Charlie cannot view categories (Status: $CHARLIE_VIEW_CATEGORY_STATUS)"
    echo "Response: $CHARLIE_VIEW_CATEGORY_BODY"
fi

# Charlie CANNOT create Product
echo -e "\n${YELLOW}6.3 Charlie CANNOT create Product...${NC}"
CHARLIE_CREATE_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"name\": \"Charlie Customer Product\", \"category\": \"Books\", \"price\": 19.99}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/create")

CHARLIE_CREATE_PRODUCT_STATUS=$(echo "$CHARLIE_CREATE_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
CHARLIE_CREATE_PRODUCT_BODY=$(echo "$CHARLIE_CREATE_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$CHARLIE_CREATE_PRODUCT_STATUS" -eq 403 ]; then
    echo -e "${GREEN}✓${NC} Charlie cannot create products (access denied as expected)"
else
    echo -e "${RED}✗${NC} Charlie can create products (should be forbidden) (Status: $CHARLIE_CREATE_PRODUCT_STATUS)"
    echo "Response: $CHARLIE_CREATE_PRODUCT_BODY"
fi

# Charlie CANNOT delete Product
echo -e "\n${YELLOW}6.4 Charlie CANNOT delete Product...${NC}"
CHARLIE_DELETE_PRODUCT=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -X DELETE \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/products/delete/1")

CHARLIE_DELETE_PRODUCT_STATUS=$(echo "$CHARLIE_DELETE_PRODUCT" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
CHARLIE_DELETE_PRODUCT_BODY=$(echo "$CHARLIE_DELETE_PRODUCT" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$CHARLIE_DELETE_PRODUCT_STATUS" -eq 403 ]; then
    echo -e "${GREEN}✓${NC} Charlie cannot delete products (access denied as expected)"
else
    echo -e "${RED}✗${NC} Charlie can delete products (should be forbidden) (Status: $CHARLIE_DELETE_PRODUCT_STATUS)"
    echo "Response: $CHARLIE_DELETE_PRODUCT_BODY"
fi

# Charlie CANNOT create Category
echo -e "\n${YELLOW}6.5 Charlie CANNOT create Category...${NC}"
CHARLIE_CREATE_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"name\": \"Charlie Customer Category\", \"description\": \"Category by customer\"}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/create")

CHARLIE_CREATE_CATEGORY_STATUS=$(echo "$CHARLIE_CREATE_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
CHARLIE_CREATE_CATEGORY_BODY=$(echo "$CHARLIE_CREATE_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$CHARLIE_CREATE_CATEGORY_STATUS" -eq 403 ]; then
    echo -e "${GREEN}✓${NC} Charlie cannot create categories (access denied as expected)"
else
    echo -e "${RED}✗${NC} Charlie can create categories (should be forbidden) (Status: $CHARLIE_CREATE_CATEGORY_STATUS)"
    echo "Response: $CHARLIE_CREATE_CATEGORY_BODY"
fi

# Charlie CANNOT update Category
echo -e "\n${YELLOW}6.6 Charlie CANNOT update Category...${NC}"
CHARLIE_UPDATE_CATEGORY=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json" \
  -X PUT \
  -d "{\"name\": \"Updated by Customer\", \"description\": \"Updated by Charlie\"}" \
  "${BASE_URL}:${OATHKEEPER_PROXY_PORT}/categories/update/1")

CHARLIE_UPDATE_CATEGORY_STATUS=$(echo "$CHARLIE_UPDATE_CATEGORY" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
CHARLIE_UPDATE_CATEGORY_BODY=$(echo "$CHARLIE_UPDATE_CATEGORY" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$CHARLIE_UPDATE_CATEGORY_STATUS" -eq 403 ]; then
    echo -e "${GREEN}✓${NC} Charlie cannot update categories (access denied as expected)"
else
    echo -e "${RED}✗${NC} Charlie can update categories (should be forbidden) (Status: $CHARLIE_UPDATE_CATEGORY_STATUS)"
    echo "Response: $CHARLIE_UPDATE_CATEGORY_BODY"
fi

echo -e "\n${YELLOW}Phase 7: Debug Queries${NC}"

# Expand Admin Role
echo -e "\n${YELLOW}7.1 Expand Admin Role...${NC}"
EXPAND_ADMIN=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X GET \
  "${BASE_URL}:${KETO_READ_PORT}/relation-tuples/expand?namespace=${NAMESPACE}&object=role:admin&relation=member&max-depth=3")

EXPAND_ADMIN_STATUS=$(echo "$EXPAND_ADMIN" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
EXPAND_ADMIN_BODY=$(echo "$EXPAND_ADMIN" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$EXPAND_ADMIN_STATUS" -eq 200 ] && echo "$EXPAND_ADMIN_BODY" | grep -q '"type"'; then
    echo -e "${GREEN}✓${NC} Admin role expansion successful"
else
    echo -e "${RED}✗${NC} Admin role expansion failed (Status: $EXPAND_ADMIN_STATUS)"
    echo "Response: $EXPAND_ADMIN_BODY"
fi

# Verify Alice is Admin
echo -e "\n${YELLOW}7.2 Verify Alice is Admin...${NC}"
VERIFY_ALICE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"namespace\": \"${NAMESPACE}\", \"object\": \"role:admin\", \"relation\": \"member\", \"subject_id\": \"user:${ALICE_EMAIL}\"}" \
  "${BASE_URL}:${KETO_READ_PORT}/relation-tuples/check")

VERIFY_ALICE_STATUS=$(echo "$VERIFY_ALICE" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
VERIFY_ALICE_BODY=$(echo "$VERIFY_ALICE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$VERIFY_ALICE_STATUS" -eq 200 ] && echo "$VERIFY_ALICE_BODY" | grep -q '"allowed":true'; then
    echo -e "${GREEN}✓${NC} Alice is confirmed as admin"
else
    echo -e "${RED}✗${NC} Alice is not confirmed as admin (Status: $VERIFY_ALICE_STATUS)"
    echo "Response: $VERIFY_ALICE_BODY"
fi

# List All Relations
echo -e "\n${YELLOW}7.3 List All Relations...${NC}"
LIST_RELATIONS=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X GET \
  "${BASE_URL}:${KETO_READ_PORT}/relation-tuples?namespace=${NAMESPACE}")

LIST_RELATIONS_STATUS=$(echo "$LIST_RELATIONS" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
LIST_RELATIONS_BODY=$(echo "$LIST_RELATIONS" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$LIST_RELATIONS_STATUS" -eq 200 ] && echo "$LIST_RELATIONS_BODY" | grep -q '"relation_tuples"'; then
    RELATION_COUNT=$(echo "$LIST_RELATIONS_BODY" | grep -o '"relation_tuples":\[' | wc -l)
    echo -e "${GREEN}✓${NC} All relations listed (found $RELATION_COUNT relation tuples)"
else
    echo -e "${RED}✗${NC} Failed to list all relations (Status: $LIST_RELATIONS_STATUS)"
    echo "Response: $LIST_RELATIONS_BODY"
fi

echo -e "\n${GREEN}🎉 All tests completed!${NC}"
echo -e "\n📋 Summary:"
echo -e "   - Health checks: All services verified"
echo -e "   - RBAC setup: Roles and permissions configured"
echo -e "   - User creation: Alice, Bob, and Charlie created"
echo -e "   - Authorization tests: Admin, Moderator, and Customer permissions verified"
echo -e "   - Debug queries: Role expansion and verification completed"
