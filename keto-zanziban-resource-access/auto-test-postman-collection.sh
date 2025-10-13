#!/bin/bash

# Automated Test Script for Keto resource access using Postman collection
# This script automatically executes all test scenarios from the Postman collection
# following the exact same structure and test cases

set -e

# Configuration
KETO_READ_URL="http://localhost:4466"
KETO_WRITE_URL="http://localhost:4467"
NAMESPACE="resource-rbac"

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

echo -e "${PURPLE}🏗️ Resource-Scoped RBAC Setup${NC}"
echo "=============================="
echo "Implementing state diagram: Resource-level access with tenant isolation"
echo ""

# stateDiagram-v2 (from requirements):
#     [*] --> category#1
#     category#1 --> TA_view
#     category#1 --> TA_delete
#     TA_view --> Customer
#     category#1 --> Alice_view
#     Alice_view --> Alice
#     category#1 --> Alice_delete
#     Alice_delete --> Alice
#     TA_view --> TA_videos
#     TA_delete --> TA_videos
#     TA_videos --> TenantA
#     TenantA --> Bob
#     [*] --> category#2
#     category#2 --> TB_view
#     TB_view --> TB_videos
#     TB_videos --> TenantB
#     Alice --> Admin
#     Bob --> Customer

echo -e "${PURPLE}👥 Step 1: User Role Assignments${NC}"
echo "=================================="

# Assign roles to users
create_relation_subject_id "$NAMESPACE" "role:admin" "member" "user:alice@example.com" \
    "Alice → Admin role"

create_relation_subject_id "$NAMESPACE" "role:customer" "member" "user:bob@example.com" \
    "Bob → Customer role"

echo ""
echo -e "${PURPLE}🏢 Step 2: Tenant Memberships${NC}"
echo "=============================="

# Bob is member of TenantA
create_relation_subject_id "$NAMESPACE" "tenant:TenantA" "member" "user:bob@example.com" \
    "Bob → TenantA membership"

# Note: TenantB has no members in this test scenario (for isolation testing)

echo ""
echo -e "${PURPLE}📦 Step 3: Resource Permissions - category#1${NC}"
echo "============================================="

# Direct user permissions for Alice on category:1
create_relation_subject_id "$NAMESPACE" "category:1" "view" "user:alice@example.com" \
    "Alice can view category:1 (direct grant)"

create_relation_subject_id "$NAMESPACE" "category:1" "delete" "user:alice@example.com" \
    "Alice can delete category:1 (direct grant)"

# category:1 view permission inherits from Customer role members
create_relation_subject_set "$NAMESPACE" "category:1" "view" "$NAMESPACE" "role:customer" "member" \
    "category:1 view → Customer role (Bob inherits this)"

echo ""
echo -e "${PURPLE}🎬 Step 4: Permission Chain - category#1 → TenantA videos${NC}"
echo "=========================================================="

# category:1 permissions flow to TenantA videos
create_relation_subject_set "$NAMESPACE" "videos:TA" "view" "$NAMESPACE" "category:1" "view" \
    "videos:TA view ← category:1 view (permission inheritance)"

create_relation_subject_set "$NAMESPACE" "videos:TA" "delete" "$NAMESPACE" "category:1" "delete" \
    "videos:TA delete ← category:1 delete (permission inheritance)"

# TenantA videos accessible by TenantA members
create_relation_subject_set "$NAMESPACE" "videos:TA" "view" "$NAMESPACE" "tenant:TenantA" "member" \
    "videos:TA view ← TenantA members (Bob inherits this)"

create_relation_subject_set "$NAMESPACE" "videos:TA" "delete" "$NAMESPACE" "tenant:TenantA" "member" \
    "videos:TA delete ← TenantA members (Bob inherits this)"

echo ""
echo -e "${PURPLE}📦 Step 5: Resource Permissions - category#2${NC}"
echo "============================================="

# No direct permissions on category:2 in this test (testing isolation)
echo "   (No direct permissions - testing access isolation)"

echo ""
echo -e "${PURPLE}🎬 Step 6: Permission Chain - category#2 → TenantB videos${NC}"
echo "=========================================================="

# category:2 view permission flows to TenantB videos
create_relation_subject_set "$NAMESPACE" "videos:TB" "view" "$NAMESPACE" "category:2" "view" \
    "videos:TB view ← category:2 view (permission inheritance)"

# TenantB videos accessible by TenantB members
create_relation_subject_set "$NAMESPACE" "tenant:TenantB" "member" "$NAMESPACE" "tenant:TenantB" "member" \
    "TenantB self-reference (for testing - no actual members)"

create_relation_subject_set "$NAMESPACE" "videos:TB" "view" "$NAMESPACE" "tenant:TenantB" "member" \
    "videos:TB view ← TenantB members (isolation test)"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          PHASE 3: AUTHORIZATION TESTS              ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# === AUTHORIZATION TESTS ===

echo -e "${PURPLE}👑 Test Suite 1: Alice (Admin) - Direct Resource Permissions${NC}"
echo "============================================================="
echo "Testing: Direct user grants on category:1"
echo ""

# Alice has DIRECT permissions on category:1
run_auth_test "user:alice@example.com" "category:1" "view" "true" \
    "Test 1.1: ✅ Alice CAN view category:1 (direct grant)"

run_auth_test "user:alice@example.com" "category:1" "delete" "true" \
    "Test 1.2: ✅ Alice CAN delete category:1 (direct grant)"

echo -e "${PURPLE}👑 Test Suite 2: Alice - Inherited Video Permissions${NC}"
echo "====================================================="
echo "Testing: Permission chain category:1 → videos:TA"
echo ""

# Alice can access videos:TA via category:1 permission inheritance
run_auth_test "user:alice@example.com" "videos:TA" "view" "true" \
    "Test 2.1: ✅ Alice CAN view videos:TA (via category:1 → videos:TA chain)"

run_auth_test "user:alice@example.com" "videos:TA" "delete" "true" \
    "Test 2.2: ✅ Alice CAN delete videos:TA (via category:1 → videos:TA chain)"

echo -e "${PURPLE}👑 Test Suite 3: Alice - Tenant Isolation Tests${NC}"
echo "=================================================="
echo "Testing: Alice should NOT access TenantB resources (no permission granted)"
echo ""

# Alice has NO permissions on category:2 or TenantB resources
run_auth_test "user:alice@example.com" "category:2" "view" "false" \
    "Test 3.1: ❌ Alice CANNOT view category:2 (no permission)"

run_auth_test "user:alice@example.com" "videos:TB" "view" "false" \
    "Test 3.2: ❌ Alice CANNOT view videos:TB (TenantB isolation)"

echo ""
echo -e "${PURPLE}🛡️ Test Suite 4: Bob (Customer) - Role-Based Category Access${NC}"
echo "=============================================================="
echo "Testing: Bob accesses category:1 via Customer role"
echo ""

# Bob can view category:1 via Customer role membership
run_auth_test "user:bob@example.com" "category:1" "view" "true" \
    "Test 4.1: ✅ Bob CAN view category:1 (via Customer role)"

# Bob CANNOT delete category:1 (no delete permission for Customer role)
run_auth_test "user:bob@example.com" "category:1" "delete" "false" \
    "Test 4.2: ❌ Bob CANNOT delete category:1 (Customer role lacks delete)"

echo -e "${PURPLE}🛡️ Test Suite 5: Bob - Tenant-Based Video Access${NC}"
echo "================================================="
echo "Testing: Bob accesses videos:TA via TenantA membership"
echo ""

# Bob can access videos:TA via TenantA membership
run_auth_test "user:bob@example.com" "videos:TA" "view" "true" \
    "Test 5.1: ✅ Bob CAN view videos:TA (via TenantA membership)"

run_auth_test "user:bob@example.com" "videos:TA" "delete" "true" \
    "Test 5.2: ✅ Bob CAN delete videos:TA (via TenantA membership)"

echo -e "${PURPLE}🛡️ Test Suite 6: Bob - Cross-Tenant Isolation${NC}"
echo "==============================================="
echo "Testing: Bob should NOT access category:2 or TenantB resources"
echo ""

# Bob has NO access to category:2
run_auth_test "user:bob@example.com" "category:2" "view" "false" \
    "Test 6.1: ❌ Bob CANNOT view category:2 (no permission granted)"

# Bob has NO access to videos:TB (not member of TenantB)
run_auth_test "user:bob@example.com" "videos:TB" "view" "false" \
    "Test 6.2: ❌ Bob CANNOT view videos:TB (not TenantB member)"

run_auth_test "user:bob@example.com" "videos:TB" "delete" "false" \
    "Test 6.3: ❌ Bob CANNOT delete videos:TB (TenantB isolation)"

echo ""
echo -e "${PURPLE}🔐 Test Suite 7: Permission Chain Verification${NC}"
echo "==============================================="
echo "Testing: Complex permission inheritance paths"
echo ""

# Verify the full permission chain works
run_auth_test "user:bob@example.com" "category:1" "view" "true" \
    "Test 7.1: ✅ Verify: category:1 → Customer → Bob (role-based access)"

run_auth_test "user:bob@example.com" "videos:TA" "view" "true" \
    "Test 7.2: ✅ Verify: TenantA → Bob AND category:1 → videos:TA (dual path)"

# Test that permission chains don't leak across tenants
run_auth_test "user:alice@example.com" "videos:TB" "view" "false" \
    "Test 7.3: ❌ Verify: No cross-tenant leakage (Alice → TenantB)"

echo ""
echo -e "${PURPLE}🎯 Test Suite 8: Role Membership Verification${NC}"
echo "=============================================="
echo "Testing: User role assignments"
echo ""

# Verify role memberships directly
run_auth_test "user:alice@example.com" "role:admin" "member" "true" \
    "Test 8.1: ✅ Alice is member of Admin role"

run_auth_test "user:bob@example.com" "role:customer" "member" "true" \
    "Test 8.2: ✅ Bob is member of Customer role"

# Verify tenant memberships
run_auth_test "user:bob@example.com" "tenant:TenantA" "member" "true" \
    "Test 8.3: ✅ Bob is member of TenantA"

run_auth_test "user:alice@example.com" "tenant:TenantA" "member" "false" \
    "Test 8.4: ❌ Alice is NOT member of TenantA"

run_auth_test "user:bob@example.com" "tenant:TenantB" "member" "false" \
    "Test 8.5: ❌ Bob is NOT member of TenantB (isolation verified)"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}          PHASE 4: DEBUG QUERIES                    ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# === DEBUG QUERIES ===

echo -e "${PURPLE}🔍 Debug Section 1: Role Membership Expansion${NC}"
echo "============================================="

# Debug - Role Hierarchies
run_debug_query "expand" "role:admin" "member" "Debug 1.1: Expand Admin role members"
run_debug_query "expand" "role:customer" "member" "Debug 1.2: Expand Customer role members"

echo -e "${PURPLE}🔍 Debug Section 2: Tenant Membership Expansion${NC}"
echo "================================================"

run_debug_query "expand" "tenant:TenantA" "member" "Debug 2.1: Expand TenantA members"
run_debug_query "expand" "tenant:TenantB" "member" "Debug 2.2: Expand TenantB members"

echo -e "${PURPLE}🔍 Debug Section 3: Resource Permission Chains${NC}"
echo "==============================================="

# Debug category:1 permissions
run_debug_query "expand" "category:1" "view" "Debug 3.1: Expand category:1 view permission chain"
run_debug_query "expand" "category:1" "delete" "Debug 3.2: Expand category:1 delete permission chain"

# Debug videos:TA permissions
run_debug_query "expand" "videos:TA" "view" "Debug 3.3: Expand videos:TA view permission chain"
run_debug_query "expand" "videos:TA" "delete" "Debug 3.4: Expand videos:TA delete permission chain"

echo -e "${PURPLE}🔍 Debug Section 4: Cross-Tenant Resource Chains${NC}"
echo "================================================="

# Debug category:2 and videos:TB
run_debug_query "expand" "category:2" "view" "Debug 4.1: Expand category:2 view permission chain"
run_debug_query "expand" "videos:TB" "view" "Debug 4.2: Expand videos:TB view permission chain"

echo -e "${PURPLE}🔍 Debug Section 5: Direct Permission Checks${NC}"
echo "============================================"

# Verify Alice's direct permissions
run_debug_query "check" "category:1" "view" "user:alice@example.com" "Debug 5.1: Check Alice → category:1 view"
run_debug_query "check" "videos:TA" "view" "user:alice@example.com" "Debug 5.2: Check Alice → videos:TA view"

# Verify Bob's tenant-based permissions
run_debug_query "check" "tenant:TenantA" "member" "user:bob@example.com" "Debug 5.3: Check Bob → TenantA membership"
run_debug_query "check" "videos:TA" "view" "user:bob@example.com" "Debug 5.4: Check Bob → videos:TA view"

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
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Resource-Scoped RBAC is working correctly.${NC}"
    echo ""
    echo -e "${CYAN}✨ What was tested:${NC}"
    echo "  ✅ Resource-level permissions (category:1, category:2)"
    echo "  ✅ Permission inheritance chains (category → videos)"
    echo "  ✅ Multi-tenant isolation (TenantA, TenantB)"
    echo "  ✅ Mixed authorization models (direct, role-based, tenant-based)"
    echo "  ✅ Cross-tenant access control"
    echo ""
    echo -e "${CYAN}💡 The system is ready for:${NC}"
    echo "  1. Fine-grained resource access control"
    echo "  2. Multi-tenant SaaS applications"
    echo "  3. Complex permission inheritance scenarios"
    echo "  4. Production deployment with per-resource authorization"
    echo "  5. Integration with Oathkeeper API gateway"
    echo ""
    echo -e "${CYAN}📊 Authorization Model Summary:${NC}"
    echo "  • Alice (Admin): Direct permissions on category:1, inherited to videos:TA"
    echo "  • Bob (Customer): Role-based category:1 access, tenant-based videos:TA access"
    echo "  • Tenant Isolation: TenantA ≠ TenantB (verified)"
    echo "  • Permission Chains: category → videos → tenant → user"
    echo ""
    exit 0
else
    echo -e "${RED}💥 SOME TESTS FAILED! Please review the configuration.${NC}"
    echo ""
    echo -e "${CYAN}🔧 Debugging suggestions:${NC}"
    echo "  1. Check Keto logs: docker-compose -f ../keto/docker-compose.yaml logs -f keto"
    echo "  2. Verify namespace is 'resource-rbac' in keto/config/keto.yml"
    echo "  3. Verify all relations were created properly (check setup phase output)"
    echo "  4. Ensure Keto services are healthy"
    echo ""

    echo -e "${CYAN}🔍 Quick debug commands:${NC}"
    echo "  # List all relations in namespace"
    echo "  curl \"$KETO_READ_URL/relation-tuples?namespace=$NAMESPACE\" | jq"
    echo ""
    echo "  # Expand permission chains"
    echo "  curl \"$KETO_READ_URL/relation-tuples/expand?namespace=$NAMESPACE&object=category:1&relation=view&max-depth=10\" | jq"
    echo "  curl \"$KETO_READ_URL/relation-tuples/expand?namespace=$NAMESPACE&object=videos:TA&relation=view&max-depth=10\" | jq"
    echo ""
    echo "  # Check specific authorization"
    echo "  curl -G \"$KETO_READ_URL/relation-tuples/check\" \\"
    echo "    --data-urlencode \"namespace=$NAMESPACE\" \\"
    echo "    --data-urlencode \"object=category:1\" \\"
    echo "    --data-urlencode \"relation=view\" \\"
    echo "    --data-urlencode \"subject_id=user:alice@example.com\" | jq"
    echo ""
    exit 1
fi
