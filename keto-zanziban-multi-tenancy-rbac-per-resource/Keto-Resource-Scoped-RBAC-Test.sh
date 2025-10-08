#!/bin/bash

# Keto Multi-Tenant Resource-Scoped RBAC - Test Script
# Tests approach: user → tenant → resource (role) → action

set -e

KETO_READ_URL="http://localhost:4466"
KETO_WRITE_URL="http://localhost:4467"
NAMESPACE="resource-rbac"

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
echo -e "${BLUE}Keto Multi-Tenant Resource-Scoped RBAC Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to create relation tuple
create_relation() {
    local object=$1
    local relation=$2
    local subject_type=$3
    local subject_value=$4
    local subject_relation=$5  # For subject_set

    if [ "$subject_type" == "subject_id" ]; then
        DATA="{\"namespace\":\"$NAMESPACE\",\"object\":\"$object\",\"relation\":\"$relation\",\"subject_id\":\"$subject_value\"}"
    else
        # subject_set - subject_value is the object, subject_relation is the relation
        DATA="{\"namespace\":\"$NAMESPACE\",\"object\":\"$object\",\"relation\":\"$relation\",\"subject_set\":{\"namespace\":\"$NAMESPACE\",\"object\":\"$subject_value\",\"relation\":\"$subject_relation\"}}"
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

# Step 2: Setup Tenant A - Products
echo -e "${YELLOW}Step 2: Setting up Tenant A - Products...${NC}"

# User role assignments (per resource)
echo "  - Assigning Alice as admin for product:items in Tenant A"
create_relation "tenant:a#product:items" "admin" "subject_id" "user:alice"

# Role hierarchy (per resource): admin → moderator → customer
echo "  - Creating role hierarchy: admin → moderator → customer (for products)"
create_relation "tenant:a#product:items" "moderator" "subject_set" "tenant:a#product:items" "admin"
create_relation "tenant:a#product:items" "customer" "subject_set" "tenant:a#product:items" "moderator"

# Product permissions
echo "  - Setting product permissions for Tenant A"
create_relation "tenant:a#product:items" "view" "subject_set" "tenant:a#product:items" "customer"
create_relation "tenant:a#product:items" "create" "subject_set" "tenant:a#product:items" "moderator"
create_relation "tenant:a#product:items" "delete" "subject_set" "tenant:a#product:items" "admin"

echo -e "${GREEN}✅ Tenant A products setup complete${NC}"
echo ""

# Step 3: Setup Tenant A - Categories
echo -e "${YELLOW}Step 3: Setting up Tenant A - Categories...${NC}"

# User role assignments (separate from products!)
echo "  - Assigning Alice as moderator for category:items in Tenant A"
create_relation "tenant:a#category:items" "moderator" "subject_id" "user:alice"

# Role hierarchy: admin → moderator → customer
echo "  - Creating role hierarchy: admin → moderator → customer (for categories)"
create_relation "tenant:a#category:items" "customer" "subject_set" "tenant:a#category:items" "moderator"

# Category permissions
echo "  - Setting category permissions for Tenant A"
create_relation "tenant:a#category:items" "view" "subject_set" "tenant:a#category:items" "customer"
create_relation "tenant:a#category:items" "update" "subject_set" "tenant:a#category:items" "moderator"
create_relation "tenant:a#category:items" "create" "subject_set" "tenant:a#category:items" "admin"

echo -e "${GREEN}✅ Tenant A categories setup complete${NC}"
echo ""

# Step 4: Setup Tenant B - Products
echo -e "${YELLOW}Step 4: Setting up Tenant B - Products...${NC}"

# User role assignments
echo "  - Assigning Bob as admin for product:items in Tenant B"
create_relation "tenant:b#product:items" "admin" "subject_id" "user:bob"

echo "  - Assigning Alice as customer for product:items in Tenant B"
create_relation "tenant:b#product:items" "customer" "subject_id" "user:alice"

echo "  - Assigning Charlie as customer for product:items in Tenant B"
create_relation "tenant:b#product:items" "customer" "subject_id" "user:charlie"

# Role hierarchy: admin → customer (2-tier, no moderator)
echo "  - Creating role hierarchy: admin → customer (for products)"
create_relation "tenant:b#product:items" "customer" "subject_set" "tenant:b#product:items" "admin"

# Product permissions
echo "  - Setting product permissions for Tenant B"
create_relation "tenant:b#product:items" "view" "subject_set" "tenant:b#product:items" "customer"
create_relation "tenant:b#product:items" "create" "subject_set" "tenant:b#product:items" "admin"

echo -e "${GREEN}✅ Tenant B products setup complete${NC}"
echo ""

# Step 4.5: Setup Tenant B - Categories
echo -e "${YELLOW}Step 4.5: Setting up Tenant B - Categories...${NC}"

# User role assignments
echo "  - Assigning Bob as admin for category:items in Tenant B"
create_relation "tenant:b#category:items" "admin" "subject_id" "user:bob"

# Role hierarchy: admin → customer (2-tier)
echo "  - Creating role hierarchy: admin → customer (for categories)"
create_relation "tenant:b#category:items" "customer" "subject_set" "tenant:b#category:items" "admin"

# Category permissions
echo "  - Setting category permissions for Tenant B"
create_relation "tenant:b#category:items" "view" "subject_set" "tenant:b#category:items" "customer"
create_relation "tenant:b#category:items" "create" "subject_set" "tenant:b#category:items" "admin"

echo -e "${GREEN}✅ Tenant B categories setup complete${NC}"
echo ""

# Wait for relations to propagate
sleep 1

# Step 5: Test Alice in Tenant A - Products (Admin)
echo -e "${YELLOW}Step 5: Testing Alice in Tenant A - Products (Admin)...${NC}"

check_permission "tenant:a#product:items" "view" "user:alice" "true" \
    "Alice (admin on products) can view products in Tenant A"

check_permission "tenant:a#product:items" "create" "user:alice" "true" \
    "Alice (admin on products) can create products in Tenant A"

check_permission "tenant:a#product:items" "delete" "user:alice" "true" \
    "Alice (admin on products) can delete products in Tenant A"

echo ""

# Step 6: Test Alice in Tenant A - Categories (Moderator)
echo -e "${YELLOW}Step 6: Testing Alice in Tenant A - Categories (Moderator)...${NC}"

check_permission "tenant:a#category:items" "view" "user:alice" "true" \
    "Alice (moderator on categories) can view categories in Tenant A"

check_permission "tenant:a#category:items" "update" "user:alice" "true" \
    "Alice (moderator on categories) can update categories in Tenant A"

check_permission "tenant:a#category:items" "create" "user:alice" "false" \
    "Alice (moderator on categories) CANNOT create categories in Tenant A"

echo ""

# Step 7: Test Alice in Tenant B - Products (Customer)
echo -e "${YELLOW}Step 7: Testing Alice in Tenant B - Products (Customer)...${NC}"

check_permission "tenant:b#product:items" "view" "user:alice" "true" \
    "Alice (customer on products) can view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:alice" "false" \
    "Alice (customer on products) CANNOT create products in Tenant B"

echo ""

# Step 8: Test Alice in Tenant B - Categories (No Role)
echo -e "${YELLOW}Step 8: Testing Alice in Tenant B - Categories (No Role)...${NC}"

check_permission "tenant:b#category:items" "view" "user:alice" "false" \
    "Alice (no role on categories) CANNOT view categories in Tenant B"

check_permission "tenant:b#category:items" "create" "user:alice" "false" \
    "Alice (no role on categories) CANNOT create categories in Tenant B"

echo ""

# Step 9: Test Bob in Tenant B - Products (Admin)
echo -e "${YELLOW}Step 9: Testing Bob in Tenant B - Products (Admin)...${NC}"

check_permission "tenant:b#product:items" "view" "user:bob" "true" \
    "Bob (admin on products) can view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:bob" "true" \
    "Bob (admin on products) can create products in Tenant B"

echo ""

# Step 10: Test Bob in Tenant B - Categories (Admin)
echo -e "${YELLOW}Step 10: Testing Bob in Tenant B - Categories (Admin)...${NC}"

check_permission "tenant:b#category:items" "view" "user:bob" "true" \
    "Bob (admin on categories) can view categories in Tenant B"

check_permission "tenant:b#category:items" "create" "user:bob" "true" \
    "Bob (admin on categories) can create categories in Tenant B"

echo ""

# Step 11: Test Tenant Isolation - Bob in Tenant A Products
echo -e "${YELLOW}Step 11: Testing Tenant Isolation - Bob in Tenant A Products...${NC}"

check_permission "tenant:a#product:items" "view" "user:bob" "false" \
    "Bob (no role in Tenant A) CANNOT view products in Tenant A"

check_permission "tenant:a#product:items" "create" "user:bob" "false" \
    "Bob (no role in Tenant A) CANNOT create products in Tenant A"

check_permission "tenant:a#product:items" "delete" "user:bob" "false" \
    "Bob (no role in Tenant A) CANNOT delete products in Tenant A"

echo ""

# Step 12: Test Tenant Isolation - Bob in Tenant A Categories
echo -e "${YELLOW}Step 12: Testing Tenant Isolation - Bob in Tenant A Categories...${NC}"

check_permission "tenant:a#category:items" "view" "user:bob" "false" \
    "Bob (no role in Tenant A) CANNOT view categories in Tenant A"

check_permission "tenant:a#category:items" "create" "user:bob" "false" \
    "Bob (no role in Tenant A) CANNOT create categories in Tenant A"

check_permission "tenant:a#category:items" "update" "user:bob" "false" \
    "Bob (no role in Tenant A) CANNOT update categories in Tenant A"

echo ""

# Step 13: Test Charlie in Tenant B - Products (Customer)
echo -e "${YELLOW}Step 13: Testing Charlie in Tenant B - Products (Customer)...${NC}"

check_permission "tenant:b#product:items" "view" "user:charlie" "true" \
    "Charlie (customer) can view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:charlie" "false" \
    "Charlie (customer) CANNOT create products in Tenant B"

check_permission "tenant:b#product:items" "delete" "user:charlie" "false" \
    "Charlie (customer) CANNOT delete products in Tenant B"

echo ""

# Step 14: Test Charlie in Tenant B - Categories (No Role)
echo -e "${YELLOW}Step 14: Testing Charlie in Tenant B - Categories (No Role)...${NC}"

check_permission "tenant:b#category:items" "view" "user:charlie" "false" \
    "Charlie (no role on categories) CANNOT view categories in Tenant B"

check_permission "tenant:b#category:items" "create" "user:charlie" "false" \
    "Charlie (no role on categories) CANNOT create categories in Tenant B"

check_permission "tenant:b#category:items" "update" "user:charlie" "false" \
    "Charlie (no role on categories) CANNOT update categories in Tenant B"

echo ""

# Step 15: Test Tenant Isolation - Charlie in Tenant A Products
echo -e "${YELLOW}Step 15: Testing Tenant Isolation - Charlie in Tenant A Products...${NC}"

check_permission "tenant:a#product:items" "view" "user:charlie" "false" \
    "Charlie (no role in Tenant A) CANNOT view products in Tenant A"

check_permission "tenant:a#product:items" "create" "user:charlie" "false" \
    "Charlie (no role in Tenant A) CANNOT create products in Tenant A"

check_permission "tenant:a#product:items" "delete" "user:charlie" "false" \
    "Charlie (no role in Tenant A) CANNOT delete products in Tenant A"

echo ""

# Step 16: Test Tenant Isolation - Charlie in Tenant A Categories
echo -e "${YELLOW}Step 16: Testing Tenant Isolation - Charlie in Tenant A Categories...${NC}"

check_permission "tenant:a#category:items" "view" "user:charlie" "false" \
    "Charlie (no role in Tenant A) CANNOT view categories in Tenant A"

check_permission "tenant:a#category:items" "create" "user:charlie" "false" \
    "Charlie (no role in Tenant A) CANNOT create categories in Tenant A"

check_permission "tenant:a#category:items" "update" "user:charlie" "false" \
    "Charlie (no role in Tenant A) CANNOT update categories in Tenant A"

echo ""

# Step 17: Resource Isolation Tests
echo -e "${YELLOW}Step 17: Testing Resource Isolation...${NC}"

# Alice is admin on products but moderator on categories (different roles per resource)
echo "Verifying: Role on products ≠ role on categories (requires separate assignment per resource)"

# Alice is admin on products but can't create categories (only moderator on categories)
check_permission "tenant:a#category:items" "create" "user:alice" "false" \
    "Alice is admin on products but CANNOT create categories (only moderator on categories)"

# Charlie has customer role on products but no role on categories in Tenant B
check_permission "tenant:b#category:items" "view" "user:charlie" "false" \
    "Charlie's customer role on products does NOT grant view access to categories"

echo ""

# Step 18: Role Membership Verification
echo -e "${YELLOW}Step 18: Testing Role Membership...${NC}"

# Check Alice's roles (3 role assignments)
RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:a#product:items" \
    --data-urlencode "relation=admin" \
    --data-urlencode "subject_id=user:alice")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Alice is admin for product:items in Tenant A"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Alice should be admin for product:items in Tenant A"
    FAIL=$((FAIL + 1))
fi

RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:a#category:items" \
    --data-urlencode "relation=moderator" \
    --data-urlencode "subject_id=user:alice")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Alice is moderator for category:items in Tenant A"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Alice should be moderator for category:items in Tenant A"
    FAIL=$((FAIL + 1))
fi

RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:b#product:items" \
    --data-urlencode "relation=customer" \
    --data-urlencode "subject_id=user:alice")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Alice is customer for product:items in Tenant B"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Alice should be customer for product:items in Tenant B"
    FAIL=$((FAIL + 1))
fi

# Check Bob's roles (2 role assignments in Tenant B only)
RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:b#product:items" \
    --data-urlencode "relation=admin" \
    --data-urlencode "subject_id=user:bob")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Bob is admin for product:items in Tenant B"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Bob should be admin for product:items in Tenant B"
    FAIL=$((FAIL + 1))
fi

RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:b#category:items" \
    --data-urlencode "relation=admin" \
    --data-urlencode "subject_id=user:bob")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Bob is admin for category:items in Tenant B"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Bob should be admin for category:items in Tenant B"
    FAIL=$((FAIL + 1))
fi

# Check Charlie's role (1 role assignment)
RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:b#product:items" \
    --data-urlencode "relation=customer" \
    --data-urlencode "subject_id=user:charlie")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Charlie is customer for product:items in Tenant B"
    PASS=$((PASS + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Charlie should be customer for product:items in Tenant B"
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

echo -e "${BLUE}Key Characteristics Verified:${NC}"
echo -e "  ✅ Resource-Scoped Roles: Each resource type requires separate role assignment"
echo -e "  ✅ Tenant Isolation: No cross-tenant access"
echo -e "  ✅ Resource Isolation: Admin on products ≠ access to categories"
echo -e "  ✅ Multi-Tenant Users: Alice has different roles in different tenants"
echo -e "  ✅ Per-Resource Permissions: Fine-grained control per resource type"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
fi

echo ""
echo -e "${YELLOW}Architecture Summary:${NC}"
echo -e "  • Alice: admin on products (Tenant A), moderator on categories (Tenant A), customer on products (Tenant B)"
echo -e "  • Bob: admin on products + categories (Tenant B only)"
echo -e "  • Charlie: customer on products (Tenant B only)"
echo ""
echo -e "  Total role assignments: 6 tuples (Alice: 3, Bob: 2, Charlie: 1)"
echo -e "  (vs tenant-scoped would be: 3 tuples)"
echo ""
echo -e "${BLUE}Comparison:${NC}"
echo -e "  Resource-Scoped: 6 role assignments (more granular, per-resource control)"
echo -e "  Tenant-Scoped:   3 role assignments (simpler, role applies to all resources)"
echo ""

if [ $FAIL -eq 0 ]; then
    exit 0
else
    exit 1
fi
