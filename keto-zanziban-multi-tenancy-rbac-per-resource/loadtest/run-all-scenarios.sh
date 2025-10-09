#!/bin/bash

echo "🚀 Running All Keto Load Test Scenarios with Scale Profile"
echo "=========================================================="
echo ""

# Set environment variable for tuple threshold
export TUPLE_THRESHOLD=100000

# Run each scenario
echo "📈 Scenario 1: Tuple Explosion Impact..."
node run-tests.js --scenario scenario1 --profile stress --verbose

echo ""
echo "👥 Scenario 2: Authorization Patterns..."
node run-tests.js --scenario scenario2 --profile stress --verbose

echo ""
echo "🔧 Scenario 3: Resource Type Scaling..."
node run-tests.js --scenario scenario3 --profile stress --verbose

echo ""
echo "🏗️ Scenario 4: Hierarchical Inheritance..."
node run-tests.js --scenario scenario4 --profile stress --verbose

echo ""
echo "✅ All scenarios completed!"
echo ""
echo "📊 Generating comprehensive report..."
node analyze-results.js --input results --output reports --verbose

echo ""
echo "🎉 Load testing complete! Check reports/ directory for results."
