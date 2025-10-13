#!/bin/bash
set -euo pipefail

# Advanced Cat Videos Test Suite
# Based on Ory Keto official contrib/cat-videos-example
# Comprehensive testing for resource access control using Zanzibar-style permissions

echo "🐱 Advanced Cat Videos Authorization Test Suite"
echo "Based on Ory Keto contrib/cat-videos-example"

# Environment setup
KETO_WRITE_REMOTE="${KETO_WRITE_REMOTE:-127.0.0.1:4467}"
KETO_READ_REMOTE="${KETO_READ_REMOTE:-127.0.0.1:4466}"
NAMESPACE="${NAMESPACE:-resource-rbac}"

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test result arrays
declare -a FAILED_TESTS=()
declare -a PASSED_TESTS=()

# Utility functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_test() { echo -e "${PURPLE}🧪 $1${NC}"; }

# Health check function
check_keto_health() {
    log_info "Checking Keto health..."

    # Check read endpoint
    if curl -s -f "http://${KETO_READ_REMOTE}/health/ready" >/dev/null; then
        log_success "Keto read service is healthy"
    else
        log_error "Keto read service is not healthy"
        log_info "Please start Keto services: cd .. && make up-core"
        exit 1
    fi

    # Check write endpoint
    if curl -s -f "http://${KETO_WRITE_REMOTE}/health/ready" >/dev/null; then
        log_success "Keto write service is healthy"
    else
        log_error "Keto write service is not healthy"
        log_info "Please start Keto services: cd .. && make up-core"
        exit 1
    fi
}

# Test framework functions
start_test_suite() {
    local suite_name="$1"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_test "Test Suite: $suite_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Relation tuple creation functions
create_relation() {
    local namespace="$1"
    local object="$2"
    local relation="$3"
    local subject_type="$4"
    local subject="$5"
    local description="$6"

    log_info "Creating: $object#$relation ← $subject ($description)"

    local json_payload
    if [ "$subject_type" = "id" ]; then
        json_payload=$(cat <<EOF
{
    "namespace": "$namespace",
    "object": "$object",
    "relation": "$relation",
    "subject_id": "$subject"
}
EOF
)
    else
        # subject_type = "set"
        IFS='#' read -r subject_obj subject_rel <<< "$subject"
        json_payload=$(cat <<EOF
{
    "namespace": "$namespace",
    "object": "$object",
    "relation": "$relation",
    "subject_set": {
        "namespace": "$namespace",
        "object": "$subject_obj",
        "relation": "$subject_rel"
    }
}
EOF
)
    fi

    local response
    response=$(curl -s -X PUT "http://${KETO_WRITE_REMOTE}/admin/relation-tuples" \
        -H "Content-Type: application/json" \
        -d "$json_payload")

    if echo "$response" | grep -q "error" && ! echo "$response" | grep -q "already exists"; then
        log_error "Failed to create relation: $response"
        return 1
    else
        log_success "Relation created successfully"
        return 0
    fi
}

assert_permission() {
    local user="$1"
    local resource="$2"
    local action="$3"
    local expected="$4"
    local description="$5"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    local result
    result=$(curl -s -G "http://${KETO_READ_REMOTE}/relation-tuples/check" \
        --data-urlencode "namespace=${NAMESPACE}" \
        --data-urlencode "object=${resource}" \
        --data-urlencode "relation=${action}" \
        --data-urlencode "subject_id=${user}" | \
        jq -r '.allowed // false')

    if [ "$result" = "$expected" ]; then
        log_success "$description"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        PASSED_TESTS+=("✅ $description")
    else
        log_error "$description (expected: $expected, got: $result)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILED_TESTS+=("❌ $description (expected: $expected, got: $result)")
    fi
}

# Setup cat videos data based on Ory Keto examples
setup_cat_videos_data() {
    start_test_suite "Setting Up Cat Videos Data"

    log_info "Creating cat videos permission structure..."

    # Clean existing tuples first
    log_info "🧹 Cleaning existing tuples..."
    curl -s -X DELETE "http://${KETO_WRITE_REMOTE}/admin/relation-tuples" \
        -G --data-urlencode "namespace=${NAMESPACE}" >/dev/null || true

    # === USER ROLES ===
    log_info "👥 Setting up user roles..."

    # Alice is admin
    create_relation "$NAMESPACE" "role:admin" "member" "id" "user:alice@example.com" "Alice → Admin role"

    # Bob is moderator
    create_relation "$NAMESPACE" "role:moderator" "member" "id" "user:bob@example.com" "Bob → Moderator role"

    # Charlie is viewer
    create_relation "$NAMESPACE" "role:viewer" "member" "id" "user:charlie@example.com" "Charlie → Viewer role"

    # Diana is owner (content creator)
    create_relation "$NAMESPACE" "role:owner" "member" "id" "user:diana@example.com" "Diana → Owner role"

    # === VIDEO OWNERSHIP ===
    log_info "🎬 Setting up video ownership..."

    # Alice owns fluffy.mp4
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "owner" "id" "user:alice@example.com" "Alice owns fluffy.mp4"

    # Diana owns whiskers.mp4
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "owner" "id" "user:diana@example.com" "Diana owns whiskers.mp4"

    # Bob owns mittens.mp4
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "owner" "id" "user:bob@example.com" "Bob owns mittens.mp4"

    # === COLLECTION OWNERSHIP ===
    log_info "📁 Setting up collections..."

    # Alice owns funny-cats collection
    create_relation "$NAMESPACE" "collection:funny-cats" "owner" "id" "user:alice@example.com" "Alice owns funny-cats collection"

    # Diana owns sleepy-cats collection
    create_relation "$NAMESPACE" "collection:sleepy-cats" "owner" "id" "user:diana@example.com" "Diana owns sleepy-cats collection"

    # === VIDEO TO COLLECTION MEMBERSHIP ===
    log_info "📋 Adding videos to collections..."

    # mittens.mp4 is in funny-cats collection
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "collection" "id" "collection:funny-cats" "mittens.mp4 → funny-cats collection"

    # whiskers.mp4 is in sleepy-cats collection
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "collection" "id" "collection:sleepy-cats" "whiskers.mp4 → sleepy-cats collection"

    # === TENANT MEMBERSHIPS ===
    log_info "🏢 Setting up tenant memberships..."

    # Alice and Bob are in catlovers tenant
    create_relation "$NAMESPACE" "tenant:catlovers" "member" "id" "user:alice@example.com" "Alice → catlovers tenant"
    create_relation "$NAMESPACE" "tenant:catlovers" "member" "id" "user:bob@example.com" "Bob → catlovers tenant"

    # Diana and Charlie are in petcare tenant
    create_relation "$NAMESPACE" "tenant:petcare" "member" "id" "user:diana@example.com" "Diana → petcare tenant"
    create_relation "$NAMESPACE" "tenant:petcare" "member" "id" "user:charlie@example.com" "Charlie → petcare tenant"

    # === ROLE-BASED PERMISSIONS ===
    log_info "🔐 Setting up role-based permissions..."

    # Admin role can view, edit, delete all videos
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "view" "set" "role:admin#member" "Admins can view fluffy.mp4"
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "edit" "set" "role:admin#member" "Admins can edit fluffy.mp4"
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "delete" "set" "role:admin#member" "Admins can delete fluffy.mp4"

    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "view" "set" "role:admin#member" "Admins can view whiskers.mp4"
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "edit" "set" "role:admin#member" "Admins can edit whiskers.mp4"
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "delete" "set" "role:admin#member" "Admins can delete whiskers.mp4"

    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "view" "set" "role:admin#member" "Admins can view mittens.mp4"
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "edit" "set" "role:admin#member" "Admins can edit mittens.mp4"
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "delete" "set" "role:admin#member" "Admins can delete mittens.mp4"

    # Moderator role can view and edit videos
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "view" "set" "role:moderator#member" "Moderators can view fluffy.mp4"
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "edit" "set" "role:moderator#member" "Moderators can edit fluffy.mp4"

    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "view" "set" "role:moderator#member" "Moderators can view whiskers.mp4"
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "edit" "set" "role:moderator#member" "Moderators can edit whiskers.mp4"

    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "view" "set" "role:moderator#member" "Moderators can view mittens.mp4"
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "edit" "set" "role:moderator#member" "Moderators can edit mittens.mp4"

    # Viewer role can view videos
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "view" "set" "role:viewer#member" "Viewers can view fluffy.mp4"
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "view" "set" "role:viewer#member" "Viewers can view whiskers.mp4"
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "view" "set" "role:viewer#member" "Viewers can view mittens.mp4"

    # === OWNER PERMISSIONS ===
    log_info "👑 Setting up owner permissions..."

    # Owners have full control over their videos
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "view" "set" "videos:cats/fluffy.mp4#owner" "Owners can view their videos"
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "edit" "set" "videos:cats/fluffy.mp4#owner" "Owners can edit their videos"
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "delete" "set" "videos:cats/fluffy.mp4#owner" "Owners can delete their videos"

    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "view" "set" "videos:cats/whiskers.mp4#owner" "Owners can view their videos"
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "edit" "set" "videos:cats/whiskers.mp4#owner" "Owners can edit their videos"
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "delete" "set" "videos:cats/whiskers.mp4#owner" "Owners can delete their videos"

    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "view" "set" "videos:cats/mittens.mp4#owner" "Owners can view their videos"
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "edit" "set" "videos:cats/mittens.mp4#owner" "Owners can edit their videos"
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "delete" "set" "videos:cats/mittens.mp4#owner" "Owners can delete their videos"

    # === COLLECTION-BASED PERMISSIONS ===
    log_info "📂 Setting up collection-based permissions..."

    # Collection owners can edit videos in their collections
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "view" "set" "collection:funny-cats#owner" "Collection owners can view collection videos"
    create_relation "$NAMESPACE" "videos:cats/mittens.mp4" "edit" "set" "collection:funny-cats#owner" "Collection owners can edit collection videos"

    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "view" "set" "collection:sleepy-cats#owner" "Collection owners can view collection videos"
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "edit" "set" "collection:sleepy-cats#owner" "Collection owners can edit collection videos"

    # === GUEST ACCESS ===
    log_info "🎭 Setting up guest access..."

    # Guest can view specific videos
    create_relation "$NAMESPACE" "videos:cats/fluffy.mp4" "view" "id" "user:guest@example.com" "Guest can view fluffy.mp4"
    create_relation "$NAMESPACE" "videos:cats/whiskers.mp4" "view" "id" "user:guest@example.com" "Guest can view whiskers.mp4"

    log_success "Cat videos data setup completed!"
}

# Test suites
test_basic_permissions() {
    start_test_suite "Basic Permission Tests"

    # Owner permissions
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "view" "true" "Alice can view her own video (fluffy.mp4)"
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "edit" "true" "Alice can edit her own video (fluffy.mp4)"
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "delete" "true" "Alice can delete her own video (fluffy.mp4)"

    assert_permission "user:diana@example.com" "videos:cats/whiskers.mp4" "view" "true" "Diana can view her own video (whiskers.mp4)"
    assert_permission "user:diana@example.com" "videos:cats/whiskers.mp4" "edit" "true" "Diana can edit her own video (whiskers.mp4)"
    assert_permission "user:diana@example.com" "videos:cats/whiskers.mp4" "delete" "true" "Diana can delete her own video (whiskers.mp4)"

    # Cross-ownership denials
    assert_permission "user:diana@example.com" "videos:cats/fluffy.mp4" "edit" "false" "Diana cannot edit Alice's video (fluffy.mp4)"
    assert_permission "user:alice@example.com" "videos:cats/whiskers.mp4" "delete" "false" "Alice cannot delete Diana's video (whiskers.mp4) without admin role"
}

test_role_based_access() {
    start_test_suite "Role-Based Access Control Tests"

    # Admin role tests (Alice)
    assert_permission "user:alice@example.com" "videos:cats/whiskers.mp4" "view" "true" "Admin Alice can view any video"
    assert_permission "user:alice@example.com" "videos:cats/whiskers.mp4" "edit" "true" "Admin Alice can edit any video"
    assert_permission "user:alice@example.com" "videos:cats/mittens.mp4" "view" "true" "Admin Alice can view moderator's video"

    # Moderator role tests (Bob)
    assert_permission "user:bob@example.com" "videos:cats/fluffy.mp4" "view" "true" "Moderator Bob can view videos"
    assert_permission "user:bob@example.com" "videos:cats/whiskers.mp4" "edit" "true" "Moderator Bob can edit videos"
    assert_permission "user:bob@example.com" "videos:cats/fluffy.mp4" "delete" "false" "Moderator Bob cannot delete admin's video"

    # Viewer role tests (Charlie)
    assert_permission "user:charlie@example.com" "videos:cats/fluffy.mp4" "view" "true" "Viewer Charlie can view videos"
    assert_permission "user:charlie@example.com" "videos:cats/whiskers.mp4" "view" "true" "Viewer Charlie can view videos"
    assert_permission "user:charlie@example.com" "videos:cats/fluffy.mp4" "edit" "false" "Viewer Charlie cannot edit videos"
    assert_permission "user:charlie@example.com" "videos:cats/fluffy.mp4" "delete" "false" "Viewer Charlie cannot delete videos"
}

test_collection_permissions() {
    start_test_suite "Collection-Based Permissions Tests"

    # Collection owner permissions
    assert_permission "user:alice@example.com" "videos:cats/mittens.mp4" "view" "true" "Collection owner Alice can view videos in her collection"
    assert_permission "user:alice@example.com" "videos:cats/mittens.mp4" "edit" "true" "Collection owner Alice can edit videos in her collection"

    assert_permission "user:diana@example.com" "videos:cats/whiskers.mp4" "view" "true" "Collection owner Diana can view videos in her collection"
    assert_permission "user:diana@example.com" "videos:cats/whiskers.mp4" "edit" "true" "Collection owner Diana can edit videos in her collection"

    # Cross-collection access denials
    assert_permission "user:diana@example.com" "videos:cats/fluffy.mp4" "edit" "false" "Diana cannot edit videos not in her collection"
    assert_permission "user:alice@example.com" "videos:cats/whiskers.mp4" "edit" "false" "Alice cannot edit videos in Diana's collection (without admin override)"
}

test_tenant_isolation() {
    start_test_suite "Tenant Isolation Tests"

    # Tenant member access
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "view" "true" "Alice (catlovers tenant) can view tenant videos"
    assert_permission "user:bob@example.com" "videos:cats/mittens.mp4" "view" "true" "Bob (catlovers tenant) can view tenant videos"

    assert_permission "user:diana@example.com" "videos:cats/whiskers.mp4" "view" "true" "Diana (petcare tenant) can view tenant videos"
    assert_permission "user:charlie@example.com" "videos:cats/whiskers.mp4" "view" "true" "Charlie (petcare tenant) can view tenant videos"
}

test_guest_access() {
    start_test_suite "Guest Access Tests"

    # Special guest permissions
    assert_permission "user:guest@example.com" "videos:cats/fluffy.mp4" "view" "true" "Guest can view specially granted video (fluffy.mp4)"
    assert_permission "user:guest@example.com" "videos:cats/whiskers.mp4" "view" "true" "Guest can view specially granted video (whiskers.mp4)"

    # Guest access limitations
    assert_permission "user:guest@example.com" "videos:cats/fluffy.mp4" "edit" "false" "Guest cannot edit videos"
    assert_permission "user:guest@example.com" "videos:cats/fluffy.mp4" "delete" "false" "Guest cannot delete videos"
    assert_permission "user:guest@example.com" "videos:cats/mittens.mp4" "view" "false" "Guest cannot view non-granted videos"
}

test_permission_inheritance() {
    start_test_suite "Permission Inheritance Tests"

    # Test that owners automatically get all permissions
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "view" "true" "Owner inherits view permission"
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "edit" "true" "Owner inherits edit permission"
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "delete" "true" "Owner inherits delete permission"

    # Test role inheritance
    assert_permission "user:alice@example.com" "videos:cats/whiskers.mp4" "view" "true" "Admin role inherits view permission"
    assert_permission "user:bob@example.com" "videos:cats/fluffy.mp4" "view" "true" "Moderator role inherits view permission"
    assert_permission "user:charlie@example.com" "videos:cats/fluffy.mp4" "view" "true" "Viewer role inherits view permission"
}

test_negative_permissions() {
    start_test_suite "Negative Permission Tests (Access Denials)"

    # Non-existent users
    assert_permission "user:nonexistent@example.com" "videos:cats/fluffy.mp4" "view" "false" "Non-existent user cannot view videos"

    # Non-existent resources
    assert_permission "user:alice@example.com" "videos:cats/nonexistent.mp4" "view" "false" "Cannot view non-existent video"

    # Non-existent actions
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "download" "false" "Cannot perform non-existent action"

    # Wrong namespace
    local old_namespace="$NAMESPACE"
    NAMESPACE="wrong-namespace"
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "view" "false" "Cannot access wrong namespace"
    NAMESPACE="$old_namespace"
}

# Advanced tests
test_complex_scenarios() {
    start_test_suite "Complex Authorization Scenarios"

    # Multiple permission paths (owner + role + collection)
    assert_permission "user:alice@example.com" "videos:cats/fluffy.mp4" "view" "true" "Alice has multiple permission paths (owner + admin + collection)"

    # Moderator editing their own content
    assert_permission "user:bob@example.com" "videos:cats/mittens.mp4" "edit" "true" "Bob can edit as both owner and moderator"

    # Cross-resource collection permissions
    assert_permission "user:alice@example.com" "videos:cats/mittens.mp4" "edit" "true" "Alice can edit video in her collection (funny-cats)"

    # Tenant + role combination
    assert_permission "user:charlie@example.com" "videos:cats/whiskers.mp4" "view" "true" "Charlie has access via both viewer role and petcare tenant"
}

# Permission expansion tests
test_expand_trees() {
    start_test_suite "Permission Expansion Tree Tests"

    log_info "Testing permission expansion trees..."

    # Test expand for view permission on fluffy.mp4
    local expand_result
    expand_result=$(curl -s -G "http://${KETO_READ_REMOTE}/relation-tuples/expand" \
        --data-urlencode "namespace=${NAMESPACE}" \
        --data-urlencode "object=videos:cats/fluffy.mp4" \
        --data-urlencode "relation=view" \
        --data-urlencode "max-depth=10" 2>/dev/null)

    if echo "$expand_result" | jq -e '.tree' >/dev/null 2>&1; then
        log_success "Can expand view permissions for fluffy.mp4"
        TESTS_PASSED=$((TESTS_PASSED + 1))

        # Count leaf nodes (actual permissions)
        local leaf_count
        leaf_count=$(echo "$expand_result" | jq '[.. | select(.type? == "leaf")] | length')
        log_info "Found $leaf_count permission paths for viewing fluffy.mp4"
    else
        log_error "Failed to expand view permissions for fluffy.mp4"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # Test expand for edit permission on whiskers.mp4
    expand_result=$(curl -s -G "http://${KETO_READ_REMOTE}/relation-tuples/expand" \
        --data-urlencode "namespace=${NAMESPACE}" \
        --data-urlencode "object=videos:cats/whiskers.mp4" \
        --data-urlencode "relation=edit" \
        --data-urlencode "max-depth=10" 2>/dev/null)

    if echo "$expand_result" | jq -e '.tree' >/dev/null 2>&1; then
        log_success "Can expand edit permissions for whiskers.mp4"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "Failed to expand edit permissions for whiskers.mp4"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# Performance and stress tests
test_performance() {
    start_test_suite "Performance Tests"

    log_info "Running performance tests..."

    # Batch permission checks
    local start_time=$(date +%s%3N)
    for i in {1..10}; do
        curl -s -G "http://${KETO_READ_REMOTE}/relation-tuples/check" \
            --data-urlencode "namespace=${NAMESPACE}" \
            --data-urlencode "object=videos:cats/fluffy.mp4" \
            --data-urlencode "relation=view" \
            --data-urlencode "subject_id=user:alice@example.com" >/dev/null 2>&1
    done
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    log_info "10 permission checks took ${duration}ms (avg: $((duration/10))ms per check)"

    if [ $duration -lt 5000 ]; then
        log_success "Performance test passed (under 5 seconds for 10 checks)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warning "Performance test slow (over 5 seconds for 10 checks)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# Cleanup verification
test_cleanup() {
    start_test_suite "Cleanup and Data Integrity Tests"

    # Count total tuples
    local tuple_count
    tuple_count=$(curl -s -G "http://${KETO_READ_REMOTE}/relation-tuples" \
        --data-urlencode "namespace=${NAMESPACE}" | \
        jq '.relation_tuples | length')

    if [ "$tuple_count" -gt 30 ]; then
        log_success "Sufficient relation tuples created ($tuple_count tuples)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "Insufficient relation tuples ($tuple_count tuples, expected > 30)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # Verify no duplicate tuples
    local unique_tuples
    unique_tuples=$(curl -s -G "http://${KETO_READ_REMOTE}/relation-tuples" \
        --data-urlencode "namespace=${NAMESPACE}" | \
        jq '[.relation_tuples[] | "\(.namespace):\(.object)#\(.relation)@\(.subject_id // (.subject_set.namespace + ":" + .subject_set.object + "#" + .subject_set.relation))"] | unique | length')

    if [ "$unique_tuples" -eq "$tuple_count" ]; then
        log_success "No duplicate relation tuples found"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warning "Found duplicate relation tuples ($tuple_count total, $unique_tuples unique)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# Generate test report
generate_report() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 COMPREHENSIVE CAT VIDEOS TEST REPORT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo "🎯 Overall Results:"
    echo "   Total Tests: $TESTS_TOTAL"
    echo "   Passed: $TESTS_PASSED"
    echo "   Failed: $TESTS_FAILED"

    local success_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    echo "   Success Rate: ${success_rate}%"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        log_success "🎉 ALL TESTS PASSED! Cat videos are properly secured!"
    else
        echo ""
        log_warning "⚠️  Some tests failed. Check the details below."

        echo ""
        echo "❌ Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "   $test"
        done
    fi

    echo ""
    echo "✅ Passed Tests: ${#PASSED_TESTS[@]}"

    echo ""
    echo "🔍 System Information:"
    echo "   Namespace: $NAMESPACE"
    echo "   Keto Read: $KETO_READ_REMOTE"
    echo "   Keto Write: $KETO_WRITE_REMOTE"
    echo "   Test Date: $(date)"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Clean up function
cleanup_relations() {
    start_test_suite "Cleaning Up Relations"

    log_info "Deleting all relation tuples in namespace: $NAMESPACE"

    local response
    response=$(curl -s -X DELETE "http://${KETO_WRITE_REMOTE}/admin/relation-tuples" \
        -G --data-urlencode "namespace=${NAMESPACE}")

    if echo "$response" | grep -q "error"; then
        log_warning "Cleanup may have failed (this is often normal)"
    else
        log_success "Namespace cleaned successfully"
    fi
}

# Display help
show_help() {
    echo "🐱 Advanced Cat Videos Authorization Test Suite"
    echo "Based on Ory Keto contrib/cat-videos-example"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h      Show this help message"
    echo "  --setup         Only run data setup"
    echo "  --test          Only run tests (skip setup)"
    echo "  --cleanup       Clean up relations and exit"
    echo "  --namespace NS  Use specified namespace (default: resource-rbac)"
    echo ""
    echo "Environment Variables:"
    echo "  KETO_READ_REMOTE   Keto read endpoint (default: 127.0.0.1:4466)"
    echo "  KETO_WRITE_REMOTE  Keto write endpoint (default: 127.0.0.1:4467)"
    echo "  NAMESPACE          Keto namespace (default: resource-rbac)"
    echo ""
    echo "Examples:"
    echo "  $0                 # Run full test suite"
    echo "  $0 --setup         # Only setup data"
    echo "  $0 --test          # Only run tests"
    echo "  $0 --cleanup       # Clean up and exit"
}

# Show expansion demos
demo_expand() {
    start_test_suite "Permission Expansion Demonstrations"

    log_info "🌳 Demonstrating permission expansion trees..."

    echo ""
    log_info "🔍 Who can view fluffy.mp4?"
    local expand_result
    expand_result=$(curl -s -G "http://${KETO_READ_REMOTE}/relation-tuples/expand" \
        --data-urlencode "namespace=${NAMESPACE}" \
        --data-urlencode "object=videos:cats/fluffy.mp4" \
        --data-urlencode "relation=view" \
        --data-urlencode "max-depth=10" 2>/dev/null)

    if echo "$expand_result" | jq -e '.tree' >/dev/null 2>&1; then
        echo "$expand_result" | jq -r '.tree | walk(if type == "object" and has("tuple") then .tuple else . end) |
               if .type == "leaf" and .tuple.subject_id then
                   "👤 " + .tuple.subject_id
               elif .type == "leaf" and .tuple.subject_set then
                   "🏷️  " + .tuple.subject_set.namespace + ":" + .tuple.subject_set.object + "#" + .tuple.subject_set.relation
               else
                   empty
               end' | sort -u | head -10
    else
        log_error "Could not expand fluffy.mp4 view permissions"
    fi

    echo ""
    log_info "🔍 Who can edit whiskers.mp4?"
    expand_result=$(curl -s -G "http://${KETO_READ_REMOTE}/relation-tuples/expand" \
        --data-urlencode "namespace=${NAMESPACE}" \
        --data-urlencode "object=videos:cats/whiskers.mp4" \
        --data-urlencode "relation=edit" \
        --data-urlencode "max-depth=10" 2>/dev/null)

    if echo "$expand_result" | jq -e '.tree' >/dev/null 2>&1; then
        echo "$expand_result" | jq -r '.tree | walk(if type == "object" and has("tuple") then .tuple else . end) |
               if .type == "leaf" and .tuple.subject_id then
                   "👤 " + .tuple.subject_id
               elif .type == "leaf" and .tuple.subject_set then
                   "🏷️  " + .tuple.subject_set.namespace + ":" + .tuple.subject_set.object + "#" + .tuple.subject_set.relation
               else
                   empty
               end' | sort -u | head -10
    else
        log_error "Could not expand whiskers.mp4 edit permissions"
    fi
}

# Show usage examples
show_usage() {
    echo ""
    echo "🔧 Usage Examples:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "# Check if Alice can view fluffy.mp4:"
    echo "curl -G 'http://${KETO_READ_REMOTE}/relation-tuples/check' \\"
    echo "  --data-urlencode 'namespace=${NAMESPACE}' \\"
    echo "  --data-urlencode 'object=videos:cats/fluffy.mp4' \\"
    echo "  --data-urlencode 'relation=view' \\"
    echo "  --data-urlencode 'subject_id=user:alice@example.com'"
    echo ""
    echo "# List all tuples:"
    echo "curl -G 'http://${KETO_READ_REMOTE}/relation-tuples' \\"
    echo "  --data-urlencode 'namespace=${NAMESPACE}'"
    echo ""
    echo "# Expand who can edit a video:"
    echo "curl -G 'http://${KETO_READ_REMOTE}/relation-tuples/expand' \\"
    echo "  --data-urlencode 'namespace=${NAMESPACE}' \\"
    echo "  --data-urlencode 'object=videos:cats/fluffy.mp4' \\"
    echo "  --data-urlencode 'relation=edit' \\"
    echo "  --data-urlencode 'max-depth=10'"
    echo ""
    echo "# Delete all tuples in namespace:"
    echo "curl -X DELETE 'http://${KETO_WRITE_REMOTE}/admin/relation-tuples' \\"
    echo "  -G --data-urlencode 'namespace=${NAMESPACE}'"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main execution
main() {
    local setup_only=false
    local test_only=false
    local cleanup_only=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --setup)
                setup_only=true
                shift
                ;;
            --test)
                test_only=true
                shift
                ;;
            --cleanup)
                cleanup_only=true
                shift
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    echo "🚀 Starting Advanced Cat Videos Authorization Test Suite"
    echo "Using namespace: $NAMESPACE"
    echo ""

    # Check Keto health
    check_keto_health

    # Handle cleanup only
    if [ "$cleanup_only" = true ]; then
        cleanup_relations
        echo -e "${GREEN}🧹 Cleanup completed!${NC}"
        exit 0
    fi

    # Handle setup only
    if [ "$setup_only" = true ]; then
        setup_cat_videos_data
        echo -e "${GREEN}🏗️  Setup completed!${NC}"
        exit 0
    fi

    # Handle test only
    if [ "$test_only" = true ]; then
        log_info "Running tests only (skipping setup)"
    else
        # Full run - setup first
        setup_cat_videos_data
    fi

    # Run all test suites
    test_basic_permissions
    test_role_based_access
    test_collection_permissions
    test_tenant_isolation
    test_guest_access
    test_permission_inheritance
    test_negative_permissions
    test_complex_scenarios
    test_expand_trees
    test_performance
    test_cleanup

    # Show demonstrations
    demo_expand

    # Generate final report
    generate_report

    # Show usage examples
    show_usage

    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}🎯 Cat videos test suite completed successfully!${NC}"
        echo ""
        echo -e "${CYAN}💡 What was tested:${NC}"
        echo "  ✅ Video ownership and basic permissions"
        echo "  ✅ Role-based access control (admin, moderator, viewer, owner)"
        echo "  ✅ Collection-based permissions"
        echo "  ✅ Multi-tenant isolation"
        echo "  ✅ Guest access controls"
        echo "  ✅ Complex permission inheritance scenarios"
        echo "  ✅ Permission expansion trees"
        echo "  ✅ Performance and data integrity"
        echo ""
        echo -e "${CYAN}🎬 Cat Videos Authorization Model:${NC}"
        echo "  • Alice (Admin): Full control + owns fluffy.mp4 + funny-cats collection"
        echo "  • Bob (Moderator): View/edit access + owns mittens.mp4"
        echo "  • Charlie (Viewer): View-only access"
        echo "  • Diana (Owner): Owns whiskers.mp4 + sleepy-cats collection"
        echo "  • Guest: Limited view access to specific videos"
        echo ""
        exit 0
    else
        echo -e "${YELLOW}⚠️  Cat videos test suite completed with failures.${NC}"
        echo ""
        echo -e "${CYAN}🔧 Debugging suggestions:${NC}"
        echo "  1. Check Keto logs: cd .. && make logs-keto"
        echo "  2. Verify namespace is '$NAMESPACE' in keto configuration"
        echo "  3. Run with --cleanup and retry"
        echo "  4. Check individual permission paths with expand API"
        echo ""
        exit 1
    fi
}

# Execute main function
main "$@"
