#!/bin/bash

# Automated Test Script for Keto Zanzibar Postman Collection
# This script automatically executes all test scenarios from the Postman collection
# following the exact same structure and test cases

set -e

# Configuration
KETO_READ_URL="http://localhost:4466"
KETO_WRITE_URL="http://localhost:4467"
NAMESPACE="simple-rbac"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SETUP_TESTS=0
AUTH_TESTS=0
DEBUG_TESTS=0

echo -e "${BLUE}🚀 Keto Zanzibar Postman Collection Auto-Test${NC}"
echo "=============================================="
echo -e "📝 Namespace: ${CYAN}$NAMESPACE${NC}"
echo -e "🔗 Keto Read URL: ${CYAN}$KETO_READ_URL${NC}"
echo -e "🔗 Keto Write URL: ${CYAN}$KETO_WRITE_URL${NC}"
echo ""

# Function to check service health
check_service_health() {
    local url="$1"
    local service_name="$2"

    echo -e "${YELLOW}🔍 Checking $service_name health...${NC}"

    local response=$(curl -s --connect-timeout 5 "$url/health/ready" 2>/dev/null || echo "error")

    if [[ $response == *"status"* ]]; then
        echo -e "${GREEN}✅ $service_name is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not healthy${NC}"
        echo "💡 Please ensure Keto is running: cd ../keto && docker-compose up -d"
        return 1
    fi
}

# Function to create relation with subject_id
create_relation_subject_id() {
    local namespace="$1"
    local object="$2"
    local relation="$3"
    local subject_id="$4"
    local description="$5"

    echo -e "${CYAN}📝 $description${NC}"
    echo "   Creating: $object#$relation ← $subject_id"

    local response=$(curl -s -X PUT "${KETO_WRITE_URL}/admin/relation-tuples" \
        -H "Content-Type: application/json" \
        -d "{
            \"namespace\": \"$namespace\",
            \"object\": \"$object\",
            \"relation\": \"$relation\",
            \"subject_id\": \"$subject_id\"
        }")

    SETUP_TESTS=$((SETUP_TESTS + 1))

    if [[ $response == *"error"* ]] && [[ $response != *"already exists"* ]]; then
        echo -e "   ${RED}❌ Failed to create relation${NC}"
        echo "   Response: $response"
        return 1
    else
        echo -e "   ${GREEN}✅ Relation created successfully${NC}"
        return 0
    fi
}

# Function to create relation with subject_set
create_relation_subject_set() {
    local namespace="$1"
    local object="$2"
    local relation="$3"
    local subject_namespace="$4"
    local subject_object="$5"
    local subject_relation="$6"
    local description="$7"

    echo -e "${CYAN}📝 $description${NC}"
    echo "   Creating: $object#$relation ← $subject_object#$subject_relation"

    local response=$(curl -s -X PUT "${KETO_WRITE_URL}/admin/relation-tuples" \
        -H "Content-Type: application/json" \
        -d "{
            \"namespace\": \"$namespace\",
            \"object\": \"$object\",
            \"relation\": \"$relation\",
            \"subject_set\": {
                \"namespace\": \"$subject_namespace\",
                \"object\": \"$subject_object\",
                \"relation\": \"$subject_relation\"
            }
        }")

    SETUP_TESTS=$((SETUP_TESTS + 1))

    if [[ $response == *"error"* ]] && [[ $response != *"already exists"* ]]; then
        echo -e "   ${RED}❌ Failed to create relation${NC}"
        echo "   Response: $response"
        return 1
    else
        echo -e "   ${GREEN}✅ Relation created successfully${NC}"
        return 0
    fi
}

# Function to run authorization test
run_auth_test() {
    local user="$1"
    local resource="$2"
    local action="$3"
    local expected="$4"
    local test_name="$5"

    echo -e "${PURPLE}🧪 $test_name${NC}"

    local result=$(curl -s "${KETO_READ_URL}/relation-tuples/check" \
        -G --data-urlencode "namespace=$NAMESPACE" \
        --data-urlencode "object=$resource" \
        --data-urlencode "relation=$action" \
        --data-urlencode "subject_id=$user" | jq -r '.allowed')

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    AUTH_TESTS=$((AUTH_TESTS + 1))

    if [ "$result" = "$expected" ]; then
        echo -e "   ${GREEN}✅ PASS${NC}: $user → $action $resource: ${GREEN}$result${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}❌ FAIL${NC}: $user → $action $resource: expected ${YELLOW}$expected${NC}, got ${RED}$result${NC}"

        # Debug failed authorization - show the expansion
        echo -e "   ${CYAN}🔍 DEBUG: Expanding permission chain for $resource#$action${NC}"
        local debug_expand=$(curl -s "${KETO_READ_URL}/relation-tuples/expand" \
            -G --data-urlencode "namespace=$NAMESPACE" \
            --data-urlencode "object=$resource" \
            --data-urlencode "relation=$action" \
            --data-urlencode "max-depth=10" | jq -c .)
        echo "   Debug expansion: $debug_expand"

        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    echo ""
}

# Function to run debug query
run_debug_query() {
    local query_type="$1"
    local object="$2"
    local relation="$3"
    local description="$4"

    echo -e "${CYAN}🔍 $description${NC}"

    case $query_type in
        "expand")
            local result=$(curl -s "${KETO_READ_URL}/relation-tuples/expand" \
                -G --data-urlencode "namespace=$NAMESPACE" \
                --data-urlencode "object=$object" \
                --data-urlencode "relation=$relation" \
                --data-urlencode "max-depth=10" | jq -c .)
            ;;
        "check")
            local subject_id="$3"
            local result=$(curl -s "${KETO_READ_URL}/relation-tuples/check" \
                -G --data-urlencode "namespace=$NAMESPACE" \
                --data-urlencode "object=$object" \
                --data-urlencode "relation=$relation" \
                --data-urlencode "subject_id=$subject_id" | jq -c .)
            ;;
        "list")
            local result=$(curl -s "${KETO_READ_URL}/relation-tuples" \
                -G --data-urlencode "namespace=$NAMESPACE" | jq -c .)
            ;;
    esac

    DEBUG_TESTS=$((DEBUG_TESTS + 1))

    if [[ $result == *"error"* ]] || [[ -z $result ]]; then
        echo -e "   ${RED}❌ Query failed${NC}"
        echo "   Result: $result"
    else
        echo -e "   ${GREEN}✅ Query successful${NC}"
        if [[ ${#result} -lt 200 ]]; then
            echo "   Result: $result"
        else
            echo "   Result: ${result:0:200}... (truncated)"
        fi
    fi

    echo ""
}

# Function to clean namespace
clean_namespace() {
    echo -e "${YELLOW}🧹 Clean Namespace${NC}"
    echo "   Cleaning all relations in namespace: $NAMESPACE"

    local response=$(curl -s -X DELETE "${KETO_WRITE_URL}/admin/relation-tuples" \
        -G --data-urlencode "namespace=$NAMESPACE")

    if [[ $response == *"error"* ]]; then
        echo -e "   ${YELLOW}⚠️ Cleanup may have failed (this is often normal)${NC}"
    else
        echo -e "   ${GREEN}✅ Namespace cleaned${NC}"
    fi

    echo ""
}

# Main execution starts here
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          PHASE 1: HEALTH CHECKS                    ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Health Checks
if ! check_service_health "$KETO_READ_URL" "Keto Read Service"; then
    exit 1
fi

if ! check_service_health "$KETO_WRITE_URL" "Keto Write Service"; then
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          PHASE 2: SETUP RELATIONS                  ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Clean namespace first
clean_namespace

# === SETUP RELATIONS ===

echo -e "${PURPLE}🏗️ Role Hierarchy Setup${NC}"
echo "========================"

# Create Role Hierarchies - Fixed: Admin at top, Customer at bottom
# Moderator inherits from Admin (admin permissions flow to moderator)
create_relation_subject_set "$NAMESPACE" "role:moderator" "member" "$NAMESPACE" "role:admin" "member" \
    "Create Admin → Moderator inheritance"

# Customer inherits from Moderator (moderator permissions flow to customer)
create_relation_subject_set "$NAMESPACE" "role:customer" "member" "$NAMESPACE" "role:moderator" "member" \
    "Create Moderator → Customer inheritance"

echo ""
echo -e "${PURPLE}🔐 Role Access Permissions${NC}"
echo "==========================="

# Product Permissions
create_relation_subject_set "$NAMESPACE" "product:items" "view" "$NAMESPACE" "role:customer" "member" \
    "Product - View to Customer Role"

create_relation_subject_set "$NAMESPACE" "product:items" "create" "$NAMESPACE" "role:moderator" "member" \
    "Product - Create to Moderator Role"

create_relation_subject_set "$NAMESPACE" "product:items" "delete" "$NAMESPACE" "role:admin" "member" \
    "Product - Delete to Admin Role"

# Category Permissions
create_relation_subject_set "$NAMESPACE" "category:items" "view" "$NAMESPACE" "role:customer" "member" \
    "Category - View to Customer Role"

create_relation_subject_set "$NAMESPACE" "category:items" "update" "$NAMESPACE" "role:moderator" "member" \
    "Category - Update to Moderator Role"

create_relation_subject_set "$NAMESPACE" "category:items" "create" "$NAMESPACE" "role:admin" "member" \
    "Category - Create to Admin Role"

echo ""
echo -e "${PURPLE}👥 User Role Assignments${NC}"
echo "========================"

# Grant Roles to Users
create_relation_subject_id "$NAMESPACE" "role:customer" "member" "user:charlie" \
    "Create Employment - Charlie Customer"

create_relation_subject_id "$NAMESPACE" "role:moderator" "member" "user:bob" \
    "Create Employment - Bob Moderator"

create_relation_subject_id "$NAMESPACE" "role:admin" "member" "user:alice" \
    "Create Employment - Alice Admin"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          PHASE 3: AUTHORIZATION TESTS              ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# === AUTHORIZATION TESTS ===

echo -e "${PURPLE}👑 Authorization Tests - Alice (Admin)${NC}"
echo "======================================="
echo "Alice should have ALL permissions due to role inheritance"
echo ""

# Alice Tests - All should pass
run_auth_test "user:alice" "product:items" "create" "true" "✅ Alice CAN create Product"
run_auth_test "user:alice" "product:items" "delete" "true" "✅ Alice CAN delete Product"
run_auth_test "user:alice" "product:items" "view" "true" "✅ Alice CAN view Product"
run_auth_test "user:alice" "category:items" "create" "true" "✅ Alice CAN create Category"
run_auth_test "user:alice" "category:items" "update" "true" "✅ Alice CAN update Category"
run_auth_test "user:alice" "category:items" "view" "true" "✅ Alice CAN view Category"

echo -e "${PURPLE}🛡️ Authorization Tests - Bob (Moderator)${NC}"
echo "=========================================="
echo "Bob should have mixed permissions based on moderator role"
echo ""

# Bob Tests - Mixed results
run_auth_test "user:bob" "product:items" "create" "true" "✅ Bob CAN create Product"
run_auth_test "user:bob" "product:items" "delete" "false" "❌ Bob CANNOT delete Product"
run_auth_test "user:bob" "product:items" "view" "true" "✅ Bob CAN view Product"
run_auth_test "user:bob" "category:items" "create" "false" "❌ Bob CANNOT create Category"
run_auth_test "user:bob" "category:items" "update" "true" "✅ Bob CAN update Category"
run_auth_test "user:bob" "category:items" "view" "true" "✅ Bob CAN view Category"

echo -e "${PURPLE}👤 Authorization Tests - Charlie (Customer)${NC}"
echo "============================================"
echo "Charlie should only have view permissions"
echo ""

# Charlie Tests - Only view permissions
run_auth_test "user:charlie" "product:items" "view" "true" "✅ Charlie CAN view Product"
run_auth_test "user:charlie" "category:items" "view" "true" "✅ Charlie CAN view Category"
run_auth_test "user:charlie" "product:items" "create" "false" "❌ Charlie CANNOT create Product"
run_auth_test "user:charlie" "product:items" "delete" "false" "❌ Charlie CANNOT delete Product"
run_auth_test "user:charlie" "category:items" "create" "false" "❌ Charlie CANNOT create Category"
run_auth_test "user:charlie" "category:items" "update" "false" "❌ Charlie CANNOT update Category"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          PHASE 4: DEBUG QUERIES                    ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# === DEBUG QUERIES ===

echo -e "${PURPLE}🔍 Debug Queries${NC}"
echo "================"

# Debug - Role Hierarchies
run_debug_query "expand" "role:admin" "member" "Debug - Admin Role hierarchies"
run_debug_query "expand" "role:moderator" "member" "Debug - Moderator Role hierarchies"
run_debug_query "expand" "role:customer" "member" "Debug - Customer Role hierarchies"

# Debug - User Role Verification
run_debug_query "check" "role:admin" "member" "user:alice" "Debug - Is Alice Admin?"

# Debug - Permission Expansion
run_debug_query "expand" "product:items" "view" "Debug - Expand Product View Relations"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          PHASE 5: VERIFICATION                     ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# === VERIFICATION ===
echo -e "${PURPLE}📋 Verification - List All Relations${NC}"
echo "====================================="

run_debug_query "list" "" "" "Verification - List All Relations"

# === FINAL SUMMARY ===
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          FINAL SUMMARY                             ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}📊 Test Results Summary:${NC}"
echo "========================"
echo -e "🔧 Setup Operations: ${CYAN}$SETUP_TESTS${NC}"
echo -e "📋 Authorization Tests: ${CYAN}$AUTH_TESTS${NC}"
echo -e "🔍 Debug Queries: ${CYAN}$DEBUG_TESTS${NC}"
echo -e "📈 Total Tests: ${CYAN}$TOTAL_TESTS${NC}"
echo -e "✅ Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "❌ Failed: ${RED}$FAILED_TESTS${NC}"

if [ $TOTAL_TESTS -gt 0 ]; then
    success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    echo -e "📈 Success Rate: ${CYAN}${success_rate}%${NC}"
fi

echo ""

if [ $FAILED_TESTS -eq 0 ] && [ $PASSED_TESTS -gt 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Keto Zanzibar RBAC is working correctly.${NC}"
    echo ""
    echo -e "${CYAN}💡 The system is ready for:${NC}"
    echo "  1. Production deployment"
    echo "  2. API integration testing"
    echo "  3. Performance benchmarking"
    echo "  4. Custom authorization scenarios"
    echo ""
    exit 0
else
    echo -e "${RED}💥 SOME TESTS FAILED! Please review the configuration.${NC}"
    echo ""
    echo -e "${CYAN}🔧 Debugging suggestions:${NC}"
    echo "  1. Check Keto logs for errors"
    echo "  2. Verify all relations were created properly"
    echo "  3. Run setup phase manually: ./setup-zanzibar-rbac.sh"
    echo "  4. Test individual API calls with curl"
    echo ""

    echo -e "${CYAN}🔍 Quick debug commands:${NC}"
    echo "  curl \"$KETO_READ_URL/relation-tuples?namespace=$NAMESPACE\" | jq"
    echo "  curl \"$KETO_READ_URL/relation-tuples/expand?namespace=$NAMESPACE&object=role:admin&relation=member\" | jq"
    echo ""
    exit 1
fi
