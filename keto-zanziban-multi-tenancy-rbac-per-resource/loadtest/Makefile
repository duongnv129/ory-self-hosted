# Makefile for Keto Performance Load Testing
#
# This Makefile provides convenient commands for running load tests,
# analyzing results, and managing the testing infrastructure.

.PHONY: help install test test-all test-scenario1 test-scenario2 test-scenario3 test-scenario4 \
        test-baseline test-stress test-ci analyze clean list-scenarios check-deps

# Default target
help:
	@echo "📊 Keto Performance Load Testing"
	@echo ""
	@echo "Available commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make check-deps     - Check K6 and Node.js dependencies"
	@echo "  make list-scenarios - List available test scenarios"
	@echo ""
	@echo "Test Execution:"
	@echo "  make test           - Run all scenarios with baseline profile"
	@echo "  make test-all       - Run all scenarios (alias for test)"
	@echo "  make test-baseline  - Run all scenarios with baseline profile"
	@echo "  make test-stress    - Run all scenarios with stress profile"
	@echo "  make test-ci        - Run tests in CI mode (minimal output)"
	@echo ""
	@echo "Individual Scenarios:"
	@echo "  make test-scenario1 - Tuple Explosion Impact (15 min)"
	@echo "  make test-scenario2 - Authorization Patterns (20 min)"
	@echo "  make test-scenario3 - Resource Type Scaling (25 min)"
	@echo "  make test-scenario4 - Hierarchical Inheritance (18 min)"
	@echo ""
	@echo "Analysis:"
	@echo "  make analyze        - Analyze test results and generate reports"
	@echo "  make analyze-sla    - Focus on SLA compliance analysis"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          - Clean up result files and reports"
	@echo "  make clean-all      - Clean everything including node_modules"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed"

# Check dependencies
check-deps:
	@echo "🔍 Checking dependencies..."
	./run-tests.js --check-deps
	@echo "🔍 Checking Node.js..."
	@node --version || (echo "❌ Node.js not found. Please install Node.js 16+"; exit 1)
	@echo "✅ All dependencies OK"

# List available scenarios
list-scenarios:
	@echo "📋 Available test scenarios:"
	./run-tests.js --list

# Test execution targets
test: test-all

test-all:
	@echo "🚀 Running all scenarios with baseline profile..."
	./run-tests.js --scenario all --profile baseline

test-baseline:
	@echo "🚀 Running baseline load tests..."
	./run-tests.js --scenario all --profile baseline

test-stress:
	@echo "⚡ Running stress tests..."
	./run-tests.js --scenario all --profile stress

test-ci:
	@echo "🤖 Running CI tests..."
	./run-tests.js --scenario all --profile baseline --ci

# Individual scenario targets
test-scenario1:
	@echo "📈 Running Scenario 1: Tuple Explosion Impact..."
	./run-tests.js --scenario scenario1 --profile stress

test-scenario2:
	@echo "👥 Running Scenario 2: Authorization Patterns..."
	./run-tests.js --scenario scenario2 --profile stress

test-scenario3:
	@echo "🔧 Running Scenario 3: Resource Type Scaling..."
	./run-tests.js --scenario scenario3 --profile stress

test-scenario4:
	@echo "🏗️ Running Scenario 4: Hierarchical Inheritance..."
	./run-tests.js --scenario scenario4 --profile stress

# Quick scenario combinations
test-core: test-scenario1 test-scenario2
	@echo "✅ Core scenarios completed"

test-scaling: test-scenario3 test-scenario4
	@echo "✅ Scaling scenarios completed"

# Analysis targets
analyze:
	@echo "📊 Analyzing test results..."
	./analyze-results.js --input results --output reports --verbose

analyze-sla:
	@echo "📋 Analyzing SLA compliance..."
	./analyze-results.js --input results --output reports --sla --verbose

analyze-trends:
	@echo "📈 Analyzing performance trends..."
	./analyze-results.js --input results --output reports --trends --verbose

# Analyze specific scenario results
analyze-scenario1:
	@echo "📊 Analyzing Scenario 1 results..."
	find results -name "*scenario1*" -type f | head -1 | xargs -I {} ./analyze-results.js --file {}

analyze-scenario2:
	@echo "📊 Analyzing Scenario 2 results..."
	find results -name "*scenario2*" -type f | head -1 | xargs -I {} ./analyze-results.js --file {}

analyze-scenario3:
	@echo "📊 Analyzing Scenario 3 results..."
	find results -name "*scenario3*" -type f | head -1 | xargs -I {} ./analyze-results.js --file {}

analyze-scenario4:
	@echo "📊 Analyzing Scenario 4 results..."
	find results -name "*scenario4*" -type f | head -1 | xargs -I {} ./analyze-results.js --file {}

# Maintenance targets
clean:
	@echo "🧹 Cleaning up result files..."
	rm -rf results/*.json reports/*.json
	@echo "✅ Results cleaned"

clean-results:
	@echo "🧹 Cleaning result files..."
	rm -rf results/
	mkdir -p results
	@echo "✅ Results directory cleaned"

clean-reports:
	@echo "🧹 Cleaning report files..."
	rm -rf reports/
	mkdir -p reports
	@echo "✅ Reports directory cleaned"

clean-all: clean
	@echo "🧹 Cleaning everything..."
	rm -rf node_modules
	@echo "✅ Everything cleaned"

# Setup targets
setup: install check-deps
	@echo "🎯 Creating result and report directories..."
	mkdir -p results reports
	@echo "✅ Setup completed"

# Development targets
dev-test:
	@echo "🔧 Running quick development test..."
	./run-tests.js --scenario scenario1 --profile baseline

# CI/CD targets
ci-test: check-deps test-ci analyze
	@echo "🤖 CI pipeline completed"

# Comprehensive test suite
test-comprehensive: test-baseline analyze
	@echo "📊 Comprehensive testing completed"

# Performance validation (for CI/CD)
validate-performance: test-ci
	@echo "✅ Performance validation completed"
	@if [ -f "reports/analysis-summary-"*.json ]; then \
		echo "📋 Performance summary available in reports/"; \
	else \
		echo "❌ No performance summary generated"; \
		exit 1; \
	fi

# Generate quick status report
status:
	@echo "📊 Test Environment Status:"
	@echo "   Results: $$(ls -1 results/*.json 2>/dev/null | wc -l) files"
	@echo "   Reports: $$(ls -1 reports/*.json 2>/dev/null | wc -l) files"
	@echo "   Last test: $$(ls -1t results/*.json 2>/dev/null | head -1 | xargs basename 2>/dev/null || echo 'None')"
	@echo "   K6 version: $$(k6 version 2>/dev/null | head -1 || echo 'Not installed')"
	@echo "   Node version: $$(node --version 2>/dev/null || echo 'Not installed')"

# Documentation targets
docs:
	@echo "📚 Opening documentation..."
	@echo "   README: loadtest/README.md"
	@echo "   Scenarios: loadtest/k6/scenarios/"
	@echo "   Config: loadtest/k6/config.js"
	@echo "   Utils: loadtest/k6/utils/"

# Development helpers
watch-results:
	@echo "👀 Watching for new results..."
	@if command -v fswatch >/dev/null 2>&1; then \
		fswatch -o results/ | xargs -n1 -I{} make analyze; \
	else \
		echo "❌ fswatch not found. Install with: brew install fswatch"; \
	fi
