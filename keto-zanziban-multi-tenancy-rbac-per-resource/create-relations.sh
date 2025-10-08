#!/bin/bash

# Script to create 10000 relation tuples with random user IDs

# Number of users to create
TOTAL_USERS=100000

echo "Creating $TOTAL_USERS relation tuples with random user IDs..."

for i in {1..100000}; do
  # Generate random user ID
  USER_ID="test_user$i"

  # Execute curl command
  curl --location --request PUT 'http://localhost:4467/admin/relation-tuples' \
  --header 'Content-Type: application/json' \
  --data "{
    \"namespace\": \"resource-rbac\",
    \"object\": \"tenant:a#product:items\",
    \"relation\": \"admin\",
    \"subject_id\": \"user:$USER_ID\"
  }"

  # Add a newline for readability
  echo ""

  # Optional: Add a small delay to avoid overwhelming the server
  # sleep 0.01
done

echo "Completed creating $TOTAL_USERS relation tuples."
