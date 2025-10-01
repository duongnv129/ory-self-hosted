#!/bin/bash

# Script to clean up Kratos test identities before running Postman tests
# This prevents the "identity conflicts" error when running tests multiple times

set -e

echo "🧹 Cleaning up Kratos test identities..."
echo "========================================"

# Configuration
KRATOS_ADMIN_URL="http://localhost:4434"

# Test user emails from the Postman collection
ALICE_EMAIL="alice@example.com"
BOB_EMAIL="bob@example.com"
CHARLIE_EMAIL="charlie@example.com"

# Function to delete identity by email
delete_identity_by_email() {
    local email=$1
    echo "🔍 Searching for identity with email: $email"

    # Find identity ID by email using jq
    local identity_id=$(curl -s "${KRATOS_ADMIN_URL}/admin/identities" 2>/dev/null | jq -r ".[] | select(.traits.email == \"$email\") | .id" | head -1)

    if [[ $? -ne 0 ]]; then
        echo -e "❌ Failed to connect to Kratos Admin Service. Is Kratos Admin running on port 4434?"
        exit 1
    fi

    if [ -n "$identity_id" ] && [ "$identity_id" != "null" ]; then
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