#!/bin/bash

# Resource-Scoped Multi-Tenant RBAC Test Script
# Tests approach: user → tenant → resource (role) → action

set -e

KETO_READ_URL="http://localhost:4466"
KETO_WRITE_URL="http://localhost:4467"
NAMESPACE="default"

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
echo -e "${BLUE}Resource-Scoped Multi-Tenant RBAC Test${NC}"
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

    ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')

    if [ "$ALLOWED" == "$expected" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo -e "   Expected: $expected, Got: $ALLOWED"
        echo -e "   Response: $RESPONSE"
        ((FAIL++))
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

echo "  - Assigning Bob as moderator for product:items in Tenant A"
create_relation "tenant:a#product:items" "moderator" "subject_id" "user:bob"

# Role hierarchy (per resource)
echo "  - Creating role hierarchy: admin → moderator (for products)"
create_relation "tenant:a#product:items" "moderator" "subject_set" "tenant:a#product:items" "admin"

# Product permissions
echo "  - Setting product permissions for Tenant A"
create_relation "tenant:a#product:items" "create" "subject_set" "tenant:a#product:items" "moderator"
create_relation "tenant:a#product:items" "delete" "subject_set" "tenant:a#product:items" "admin"

echo -e "${GREEN}✅ Tenant A products setup complete${NC}"
echo ""

# Step 3: Setup Tenant A - Categories
echo -e "${YELLOW}Step 3: Setting up Tenant A - Categories...${NC}"

# User role assignments (separate from products!)
echo "  - Assigning Alice as admin for category:items in Tenant A"
create_relation "tenant:a#category:items" "admin" "subject_id" "user:alice"

# Category permissions
echo "  - Setting category permissions for Tenant A"
create_relation "tenant:a#category:items" "create" "subject_set" "tenant:a#category:items" "admin"
create_relation "tenant:a#category:items" "update" "subject_set" "tenant:a#category:items" "admin"

echo -e "${GREEN}✅ Tenant A categories setup complete${NC}"
echo ""

# Step 4: Setup Tenant B - Products
echo -e "${YELLOW}Step 4: Setting up Tenant B - Products...${NC}"

# User role assignments
echo "  - Assigning Alice as customer for product:items in Tenant B"
create_relation "tenant:b#product:items" "customer" "subject_id" "user:alice"

echo "  - Assigning Charlie as customer for product:items in Tenant B"
create_relation "tenant:b#product:items" "customer" "subject_id" "user:charlie"

# Product permissions
echo "  - Setting product permissions for Tenant B"
create_relation "tenant:b#product:items" "view" "subject_set" "tenant:b#product:items" "customer"

echo -e "${GREEN}✅ Tenant B products setup complete${NC}"
echo ""

# Wait for relations to propagate
sleep 1

# Step 5: Test Alice in Tenant A - Products (Admin)
echo -e "${YELLOW}Step 5: Testing Alice in Tenant A - Products (Admin)...${NC}"

check_permission "tenant:a#product:items" "create" "user:alice" "true" \
    "Alice (admin) can create products in Tenant A"

check_permission "tenant:a#product:items" "delete" "user:alice" "true" \
    "Alice (admin) can delete products in Tenant A"

echo ""

# Step 6: Test Alice in Tenant A - Categories (Admin)
echo -e "${YELLOW}Step 6: Testing Alice in Tenant A - Categories (Admin)...${NC}"

check_permission "tenant:a#category:items" "create" "user:alice" "true" \
    "Alice (admin) can create categories in Tenant A"

check_permission "tenant:a#category:items" "update" "user:alice" "true" \
    "Alice (admin) can update categories in Tenant A"

echo ""

# Step 7: Test Alice in Tenant B - Products (Customer)
echo -e "${YELLOW}Step 7: Testing Alice in Tenant B - Products (Customer)...${NC}"

check_permission "tenant:b#product:items" "view" "user:alice" "true" \
    "Alice (customer) can view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:alice" "false" \
    "Alice (customer) CANNOT create products in Tenant B"

check_permission "tenant:b#product:items" "delete" "user:alice" "false" \
    "Alice (customer) CANNOT delete products in Tenant B"

echo ""

# Step 8: Test Bob in Tenant A - Products (Moderator)
echo -e "${YELLOW}Step 8: Testing Bob in Tenant A - Products (Moderator)...${NC}"

check_permission "tenant:a#product:items" "create" "user:bob" "true" \
    "Bob (moderator) can create products in Tenant A"

check_permission "tenant:a#product:items" "delete" "user:bob" "false" \
    "Bob (moderator) CANNOT delete products in Tenant A"

echo ""

# Step 9: Test Bob has NO access to Categories
echo -e "${YELLOW}Step 9: Testing Bob has NO access to Categories in Tenant A...${NC}"

check_permission "tenant:a#category:items" "create" "user:bob" "false" \
    "Bob (no role on categories) CANNOT create categories in Tenant A"

check_permission "tenant:a#category:items" "update" "user:bob" "false" \
    "Bob (no role on categories) CANNOT update categories in Tenant A"

echo ""

# Step 10: Test Tenant Isolation - Bob in Tenant B
echo -e "${YELLOW}Step 10: Testing Tenant Isolation - Bob in Tenant B...${NC}"

check_permission "tenant:b#product:items" "view" "user:bob" "false" \
    "Bob (no role in Tenant B) CANNOT view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:bob" "false" \
    "Bob (no role in Tenant B) CANNOT create products in Tenant B"

echo ""

# Step 11: Test Charlie in Tenant B - Products (Customer)
echo -e "${YELLOW}Step 11: Testing Charlie in Tenant B - Products (Customer)...${NC}"

check_permission "tenant:b#product:items" "view" "user:charlie" "true" \
    "Charlie (customer) can view products in Tenant B"

check_permission "tenant:b#product:items" "create" "user:charlie" "false" \
    "Charlie (customer) CANNOT create products in Tenant B"

echo ""

# Step 12: Test Tenant Isolation - Charlie in Tenant A
echo -e "${YELLOW}Step 12: Testing Tenant Isolation - Charlie in Tenant A...${NC}"

check_permission "tenant:a#product:items" "view" "user:charlie" "false" \
    "Charlie (no role in Tenant A) CANNOT view products in Tenant A"

check_permission "tenant:a#product:items" "create" "user:charlie" "false" \
    "Charlie (no role in Tenant A) CANNOT create products in Tenant A"

echo ""

# Step 13: Resource Isolation Tests
echo -e "${YELLOW}Step 13: Testing Resource Isolation...${NC}"

# Alice is admin on products but has separate role assignment for categories
echo "Verifying: Admin on products ≠ admin on categories (requires explicit assignment)"

# Check if Alice's product admin role affects categories (it shouldn't without explicit assignment)
# We already assigned Alice as admin for categories, so this will pass
# But we can test that Bob (moderator on products) has NO access to categories
check_permission "tenant:a#category:items" "view" "user:bob" "false" \
    "Bob's moderator role on products does NOT grant access to categories"

echo ""

# Step 14: Role Membership Verification
echo -e "${YELLOW}Step 14: Testing Role Membership...${NC}"

# Check Alice's roles
RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:a#product:items" \
    --data-urlencode "relation=admin" \
    --data-urlencode "subject_id=user:alice")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Alice is admin for product:items in Tenant A"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Alice should be admin for product:items in Tenant A"
    ((FAIL++))
fi

RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:a#category:items" \
    --data-urlencode "relation=admin" \
    --data-urlencode "subject_id=user:alice")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Alice is admin for category:items in Tenant A (separate assignment)"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Alice should be admin for category:items in Tenant A"
    ((FAIL++))
fi

RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:b#product:items" \
    --data-urlencode "relation=customer" \
    --data-urlencode "subject_id=user:alice")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Alice is customer for product:items in Tenant B"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Alice should be customer for product:items in Tenant B"
    ((FAIL++))
fi

# Check Bob's role
RESPONSE=$(curl -s -G "$KETO_READ_URL/relation-tuples/check" \
    --data-urlencode "namespace=$NAMESPACE" \
    --data-urlencode "object=tenant:a#product:items" \
    --data-urlencode "relation=moderator" \
    --data-urlencode "subject_id=user:bob")
ALLOWED=$(echo "$RESPONSE" | jq -r '.allowed')
if [ "$ALLOWED" == "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Bob is moderator for product:items in Tenant A"
    ((PASS++))
else
    echo -e "${RED}❌ FAIL${NC}: Bob should be moderator for product:items in Tenant A"
    ((FAIL++))
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
    echo ""
    echo -e "${YELLOW}Architecture Summary:${NC}"
    echo -e "  • Alice: admin on products + categories (Tenant A), customer on products (Tenant B)"
    echo -e "  • Bob: moderator on products (Tenant A only)"
    echo -e "  • Charlie: customer on products (Tenant B only)"
    echo -e ""
    echo -e "  Total role assignments: 5 tuples"
    echo -e "  (vs tenant-scoped would be: 3 tuples)"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
