#!/bin/bash

# Multi-Tenant RBAC Test Script
# Tests tenant-centric approach: user → tenant (role) → resource (action)

set -e

KETO_READ_URL="http://localhost:4466"
KETO_WRITE_URL="http://localhost:4467"
NAMESPACE="tenant-rbac"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Multi-Tenant RBAC Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to create relation tuple
create_relation() {
    local object=$1
    local relation=$2
    local subject_type=$3
    local subject_value=$4

    if [ "$subject_type" == "subject_id" ]; then
        DATA="{\"namespace\":\"$NAMESPACE\",\"object\":\"$object\",\"relation\":\"$relation\",\"subject_id\":\"$subject_value\"}"
    else
        # subject_set
        IFS='#' read -ra PARTS <<< "$subject_value"
        local sub_obj="${PARTS[0]}"
        local sub_rel="${PARTS[1]}"
        DATA="{\"namespace\":\"$NAMESPACE\",\"object\":\"$object\",\"relation\":\"$relation\",\"subject_set\":{\"namespace\":\"$NAMESPACE\",\"object\":\"$sub_obj\",\"relation\":\"$sub_rel\"}}"
    fi

    curl -s -X PUT "$KETO_WRITE_URL/admin/relation-tuples" \
        -H "Content-Type: application/json" \
        -d "$DATA" > /dev/null
}

# Function to check authorization
check_permission() {
    local object=$1
    local relation=$2
    local subject=$3
    local expected=$4
    local description=$5

    RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
        --data-urlencode "namespace=$NAMESPACE" \
        --data-urlencode "object=$object" \
        --data-urlencode "relation=$relation" \
        --data-urlencode "subject_id=$subject")

    # Check if response is valid JSON
    if ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo -e "   Invalid JSON response: $RESPONSE"
        FAIL=$((FAIL + 1))
        return
    fi

    ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')

    if [ "$ALLOWED" == "$expected" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo -e "   Expected: $expected, Got: $ALLOWED"
        echo -e "   Response: $RESPONSE"
        FAIL=$((FAIL + 1))
    fi
}

# Step 1: Cleanup
echo -e "${YELLOW}Step 1: Cleaning up existing relations...${NC}"
curl -s -X DELETE "$KETO_WRITE_URL/admin/relation-tuples?namespace=$NAMESPACE" > /dev/null
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

# Step 2: Setup Tenant A
echo -e "${YELLOW}Step 2: Setting up Tenant A...${NC}"

# User role assignments
echo "  - Assigning Alice as admin in Tenant A"
create_relation "tenant:a" "admin" "subject_id" "user:alice"

echo "  - Assigning Bob as moderator in Tenant A"
create_relation "tenant:a" "moderator" "subject_id" "user:bob"

# Role hierarchy
echo "  - Creating role hierarchy: admin → moderator"
create_relation "tenant:a" "moderator" "subject_set" "tenant:a#admin"

echo "  - Creating role hierarchy: moderator → customer"
create_relation "tenant:a" "customer" "subject_set" "tenant:a#moderator"

# Product permissions
echo "  - Setting product permissions for Tenant A"
create_relation "tenant:a#product:items" "view" "subject_set" "tenant:a#customer"
create_relation "tenant:a#product:items" "create" "subject_set" "tenant:a#moderator"
create_relation "tenant:a#product:items" "delete" "subject_set" "tenant:a#admin"

# Category permissions
echo "  - Setting category permissions for Tenant A"
create_relation "tenant:a#category:items" "view" "subject_set" "tenant:a#customer"
create_relation "tenant:a#category:items" "update" "subject_set" "tenant:a#moderator"
create_relation "tenant:a#category:items" "create" "subject_set" "tenant:a#admin"

echo -e "${GREEN}✅ Tenant A setup complete${NC}"
echo ""

# Step 3: Setup Tenant B
echo -e "${YELLOW}Step 3: Setting up Tenant B...${NC}"

# User role assignments
echo "  - Assigning Alice as customer in Tenant B"
create_relation "tenant:b" "customer" "subject_id" "user:alice"

echo "  - Assigning Charlie as customer in Tenant B"
create_relation "tenant:b" "customer" "subject_id" "user:charlie"

# Role hierarchy (Tenant B has no moderator, only admin → customer)
echo "  - Creating role hierarchy: admin → customer"
create_relation "tenant:b" "customer" "subject_set" "tenant:b#admin"

# Product permissions
echo "  - Setting product permissions for Tenant B"
create_relation "tenant:b#product:items" "view" "subject_set" "tenant:b#customer"
create_relation "tenant:b#product:items" "create" "subject_set" "tenant:b#admin"
create_relation "tenant:b#product:items" "delete" "subject_set" "tenant:b#admin"

# Category permissions
echo "  - Setting category permissions for Tenant B"
create_relation "tenant:b#category:items" "view" "subject_set" "tenant:b#customer"
create_relation "tenant:b#category:items" "update" "subject_set" "tenant:b#admin"
create_relation "tenant:b#category:items" "create" "subject_set" "tenant:b#admin"

echo -e "${GREEN}✅ Tenant B setup complete${NC}"
echo ""

# Wait for relations to propagate
sleep 1

# Step 4: Test Alice in Tenant A (Admin)
echo -e "${YELLOW}Step 4: Testing Alice in Tenant A (Admin)...${NC}"

check_permission "tenant:a#product:items" "view" "user:alice" "true" \
    "Alice (admin in A) can view products in Tenant A"

check_permission "tenant:a#product:items" "create" "user:alice" "true" \
    "Alice (admin in A) can create products in Tenant A"

check_permission "tenant:a#product:items" "delete" "user:alice" "true" \
    "Alice (admin in A) can delete products in Tenant A"

check_permission "tenant:a#category:items" "view" "user:alice" "true" \
    "Alice (admin in A) can view categories in Tenant A"

check_permission "tenant:a#category:items" "update" "user:alice" "true" \
    "Alice (admin in A) can update categories in Tenant A"

check_permission "tenant:a#category:items" "create" "user:alice" "true" \
    "Alice (admin in A) can create categories in Tenant A"

echo ""

# Step 5: Test Alice in Tenant B (Customer)
echo -e "${YELLOW}Step 5: Testing Alice in Tenant B (Customer)...${NC}"

check_permission "tenant:b#product:items" "view" "user:alice" "true" \
    "Alice (customer in B) can view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:alice" "false" \
    "Alice (customer in B) CANNOT create products in Tenant B"

check_permission "tenant:b#product:items" "delete" "user:alice" "false" \
    "Alice (customer in B) CANNOT delete products in Tenant B"

check_permission "tenant:b#category:items" "view" "user:alice" "true" \
    "Alice (customer in B) can view categories in Tenant B"

check_permission "tenant:b#category:items" "update" "user:alice" "false" \
    "Alice (customer in B) CANNOT update categories in Tenant B"

check_permission "tenant:b#category:items" "create" "user:alice" "false" \
    "Alice (customer in B) CANNOT create categories in Tenant B"

echo ""

# Step 6: Test Bob in Tenant A (Moderator)
echo -e "${YELLOW}Step 6: Testing Bob in Tenant A (Moderator)...${NC}"

check_permission "tenant:a#product:items" "view" "user:bob" "true" \
    "Bob (moderator in A) can view products in Tenant A"

check_permission "tenant:a#product:items" "create" "user:bob" "true" \
    "Bob (moderator in A) can create products in Tenant A"

check_permission "tenant:a#product:items" "delete" "user:bob" "false" \
    "Bob (moderator in A) CANNOT delete products in Tenant A"

check_permission "tenant:a#category:items" "view" "user:bob" "true" \
    "Bob (moderator in A) can view categories in Tenant A"

check_permission "tenant:a#category:items" "update" "user:bob" "true" \
    "Bob (moderator in A) can update categories in Tenant A"

check_permission "tenant:a#category:items" "create" "user:bob" "false" \
    "Bob (moderator in A) CANNOT create categories in Tenant A"

echo ""

# Step 7: Test Bob cannot access Tenant B
echo -e "${YELLOW}Step 7: Testing Tenant Isolation - Bob in Tenant B...${NC}"

check_permission "tenant:b#product:items" "view" "user:bob" "false" \
    "Bob (no role in B) CANNOT view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:bob" "false" \
    "Bob (no role in B) CANNOT create products in Tenant B"

check_permission "tenant:b#product:items" "delete" "user:bob" "false" \
    "Bob (no role in B) CANNOT delete products in Tenant B"

check_permission "tenant:b#category:items" "view" "user:bob" "false" \
    "Bob (no role in B) CANNOT view categories in Tenant B"

check_permission "tenant:b#category:items" "update" "user:bob" "false" \
    "Bob (no role in B) CANNOT update categories in Tenant B"

check_permission "tenant:b#category:items" "create" "user:bob" "false" \
    "Bob (no role in B) CANNOT create categories in Tenant B"

echo ""

# Step 8: Test Charlie in Tenant B (Customer)
echo -e "${YELLOW}Step 8: Testing Charlie in Tenant B (Customer)...${NC}"

check_permission "tenant:b#product:items" "view" "user:charlie" "true" \
    "Charlie (customer in B) can view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:charlie" "false" \
    "Charlie (customer in B) CANNOT create products in Tenant B"

check_permission "tenant:b#product:items" "delete" "user:charlie" "false" \
    "Charlie (customer in B) CANNOT delete products in Tenant B"

check_permission "tenant:b#category:items" "view" "user:charlie" "true" \
    "Charlie (customer in B) can view categories in Tenant B"

check_permission "tenant:b#category:items" "update" "user:charlie" "false" \
    "Charlie (customer in B) CANNOT update categories in Tenant B"

check_permission "tenant:b#category:items" "create" "user:charlie" "false" \
    "Charlie (customer in B) CANNOT create categories in Tenant B"

echo ""

# Step 9: Test Charlie cannot access Tenant A
echo -e "${YELLOW}Step 9: Testing Tenant Isolation - Charlie in Tenant A...${NC}"

check_permission "tenant:a#product:items" "view" "user:charlie" "false" \
    "Charlie (no role in A) CANNOT view products in Tenant A"

check_permission "tenant:a#product:items" "create" "user:charlie" "false" \
    "Charlie (no role in A) CANNOT create products in Tenant A"

check_permission "tenant:a#product:items" "delete" "user:charlie" "false" \
    "Charlie (no role in A) CANNOT delete products in Tenant A"

check_permission "tenant:a#category:items" "view" "user:charlie" "false" \
    "Charlie (no role in A) CANNOT view categories in Tenant A"

check_permission "tenant:a#category:items" "update" "user:charlie" "false" \
    "Charlie (no role in A) CANNOT update categories in Tenant A"

check_permission "tenant:a#category:items" "create" "user:charlie" "false" \
    "Charlie (no role in A) CANNOT create categories in Tenant A"

echo ""

# Step 10: Test Role Membership
echo -e "${YELLOW}Step 10: Testing Role Membership...${NC}"

# Check Alice's roles
RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:a" \
    --data-urlencode "relation=admin" \
    --data-urlencode "subject_id=user:alice")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Alice is admin in Tenant A"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Alice should be admin in Tenant A"
    FAIL=$((FAIL + 1))
fi

RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:b" \
    --data-urlencode "relation=customer" \
    --data-urlencode "subject_id=user:alice")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Alice is customer in Tenant B"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Alice should be customer in Tenant B"
    FAIL=$((FAIL + 1))
fi

# Check Bob's role
RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:a" \
    --data-urlencode "relation=moderator" \
    --data-urlencode "subject_id=user:bob")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Bob is moderator in Tenant A"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Bob should be moderator in Tenant A"
    FAIL=$((FAIL + 1))
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${BLUE}Total:  $((PASS + FAIL))${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
