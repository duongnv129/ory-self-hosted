#!/usr/bin/env node

/**
 * K6 Load Test Runner
 *
 * Automated test execution and result aggregation for Keto performance testing.
 * Supports individual scenario execution, full test suites, and CI/CD integration.
 *
 * Usage:
 *   ./run-tests.js --scenario all                    # Run all scenarios
 *   ./run-tests.js --scenario scenario1             # Run specific scenario
 *   ./run-tests.js --scenario scenario1,scenario3   # Run multiple scenarios
 *   ./run-tests.js --profile baseline               # Use specific load profile
 *   ./run-tests.js --output results/                # Custom output directory
 *   ./run-tests.js --ci                             # CI mode with minimal output
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { Command } = require('commander');

// Test configuration
const testConfig = {
  scenarios: {
    scenario1: {
      name: 'Tuple Explosion Impact',
      file: 'k6/scenarios/scenario1-tuple-explosion.js',
      description: 'Tests performance degradation as tuple count increases',
      estimatedDuration: '15 minutes',
      tags: ['core', 'scaling']
    },
    scenario2: {
      name: 'Authorization Patterns',
      file: 'k6/scenarios/scenario2-auth-patterns.js',
      description: 'Realistic user behavior simulation with weighted access patterns',
      estimatedDuration: '20 minutes',
      tags: ['realistic', 'behavior']
    },
    scenario3: {
      name: 'Resource Type Scaling',
      file: 'k6/scenarios/scenario3-resource-scaling.js',
      description: 'Impact of adding new resource types to the system',
      estimatedDuration: '25 minutes',
      tags: ['scaling', 'resources']
    },
    scenario4: {
      name: 'Hierarchical Permission Inheritance',
      file: 'k6/scenarios/scenario4-hierarchy-inheritance.js',
      description: 'Role hierarchy depth and inheritance pattern performance',
      estimatedDuration: '18 minutes',
      tags: ['hierarchy', 'inheritance']
    }
  }, profiles: {
    baseline: 'Baseline load testing (5→10 VUs, ~30s)',
    realworld: 'Real-world load (50→100→1K VUs, ~5 min)',
    stress: 'Stress testing (1K→5K→10K VUs, ~23 min)',
    breakingpoint: 'Breaking point analysis (10K→25K→50K→100K VUs, ~27 min)',
    validation: 'Quick validation (2→5 VUs, ~2 min)'
  },

  outputFormats: ['json', 'csv', 'junit'],

  // Performance thresholds for automated pass/fail
  thresholds: {
    'http_req_duration': { p95: 100 }, // 95% of requests under 100ms
    'http_req_failed': { rate: 0.05 },  // Less than 5% failure rate
    'checks': { rate: 0.95 }            // 95% of checks pass
  }
};

class K6TestRunner {
  constructor(options = {}) {
    this.options = {
      k6Binary: options.k6Binary || 'k6',
      outputDir: options.outputDir || 'results',
      ciMode: options.ciMode || false,
      verbose: options.verbose || false,
      detailedMetrics: options.detailedMetrics || false,  // Only enable for debugging
      ...options
    };

    this.results = [];
    this.startTime = Date.now();
  }

  /**
   * Check if K6 is installed and accessible
   */
  async checkK6Installation() {
    try {
      const version = execSync(`${this.options.k6Binary} version`, { encoding: 'utf-8' });
      this.log(`✅ K6 found: ${version.split('\n')[0]}`);
      return true;
    } catch (error) {
      this.log(`❌ K6 not found. Please install K6: https://k6.io/docs/getting-started/installation/`, 'error');
      this.log(`   Error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });
      this.log(`📁 Output directory ready: ${this.options.outputDir}`);
    } catch (error) {
      this.log(`❌ Failed to create output directory: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Run a single K6 test scenario
   */
  async runScenario(scenarioKey, profile = 'baseline') {
    const scenario = testConfig.scenarios[scenarioKey];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioKey}`);
    }

    this.log(`🚀 Starting ${scenario.name} (${scenario.estimatedDuration})`);
    this.log(`   Description: ${scenario.description}`);
    this.log(`   Tags: ${scenario.tags.join(', ')}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const summaryFile = path.join(this.options.outputDir, `${scenarioKey}-${timestamp}-summary.json`);

    // Prepare K6 command - USE SUMMARY EXPORT ONLY (much smaller)
    const k6Args = [
      'run',
      '--summary-export', summaryFile,  // Only export summary (90% smaller than full JSON)
      '-e', `LOAD_PROFILE=${profile}`,
      '--tag', `scenario=${scenarioKey}`,
      '--tag', `profile=${profile}`,
      '--tag', `timestamp=${timestamp}`,
      scenario.file
    ];

    // Optional: Add full JSON output only if explicitly requested
    if (this.options.detailedMetrics) {
      const detailedFile = path.join(this.options.outputDir, `${scenarioKey}-${timestamp}-detailed.json`);
      k6Args.splice(1, 0, '--out', `json=${detailedFile}`);
      this.log(`⚠️  Detailed metrics enabled - large file: ${detailedFile}`);
    }

    const startTime = Date.now();

    try {
      // Run K6 test
      const result = await this.executeK6(k6Args);
      const duration = Date.now() - startTime;

      // Parse results
      const testResult = {
        scenario: scenarioKey,
        name: scenario.name,
        profile,
        timestamp,
        duration,
        success: result.exitCode === 0,
        outputFile,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      };

      this.results.push(testResult);

      if (testResult.success) {
        this.log(`✅ ${scenario.name} completed successfully in ${(duration / 1000 / 60).toFixed(1)} minutes`);
      } else {
        this.log(`❌ ${scenario.name} failed (exit code: ${result.exitCode})`, 'error');
        if (result.stderr) {
          this.log(`   Error output: ${result.stderr}`, 'error');
        }
      }

      return testResult;

    } catch (error) {
      this.log(`❌ Failed to run ${scenario.name}: ${error.message}`, 'error');

      const testResult = {
        scenario: scenarioKey,
        name: scenario.name,
        profile,
        timestamp,
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        exitCode: -1
      };

      this.results.push(testResult);
      return testResult;
    }
  }

  /**
   * Execute K6 command with proper output handling
   */
  async executeK6(args) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.options.k6Binary, args, {
        stdio: this.options.ciMode ? 'pipe' : 'inherit'
      });

      let stdout = '';
      let stderr = '';

      if (this.options.ciMode) {
        process.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      process.on('close', (exitCode) => {
        resolve({
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    const reportFile = path.join(this.options.outputDir, `test-report-${Date.now()}.json`);

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalDuration: Date.now() - this.startTime,
        totalScenarios: this.results.length,
        successfulScenarios: this.results.filter(r => r.success).length,
        failedScenarios: this.results.filter(r => !r.success).length
      },
      scenarios: this.results,
      summary: this.generateSummary()
    };

    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    this.log(`📊 Test report generated: ${reportFile}`);

    return report;
  }

  /**
   * Generate test summary
   */
  generateSummary() {
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      overall: {
        status: failed === 0 ? 'PASS' : 'FAIL',
        successRate: (successful / this.results.length * 100).toFixed(1),
        totalDuration: Math.round(totalDuration / 1000 / 60), // minutes
        averageDuration: Math.round(totalDuration / this.results.length / 1000 / 60) // minutes
      },
      scenarios: this.results.map(r => ({
        scenario: r.scenario,
        name: r.name,
        status: r.success ? 'PASS' : 'FAIL',
        duration: Math.round(r.duration / 1000 / 60), // minutes
        error: r.error || null
      }))
    };
  }

  /**
   * Log message with optional level
   */
  log(message, level = 'info') {
    if (this.options.ciMode && level === 'info') return;

    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' :
      level === 'warn' ? '⚠️' :
        level === 'success' ? '✅' : 'ℹ️';

    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}

/**
 * Main CLI function
 */
async function main() {
  const program = new Command();

  program
    .name('run-tests')
    .description('K6 Load Test Runner for Keto Performance Testing')
    .version('1.0.0');

  program
    .option('-s, --scenario <scenarios>', 'Scenarios to run (comma-separated or "all")', 'all')
    .option('-p, --profile <profile>', 'Load profile to use', 'baseline')
    .option('-o, --output <directory>', 'Output directory for results', 'results')
    .option('--k6-binary <path>', 'Path to K6 binary', 'k6')
    .option('--detailed', 'Enable detailed metrics (large files - only for debugging)')
    .option('--ci', 'CI mode with minimal output')
    .option('--verbose', 'Verbose output')
    .option('--list', 'List available scenarios and exit')
    .option('--check-deps', 'Check dependencies and exit');

  program.parse();
  const options = program.opts();

  // Handle list scenarios
  if (options.list) {
    console.log('📋 Available Test Scenarios:');
    Object.entries(testConfig.scenarios).forEach(([key, scenario]) => {
      console.log(`   ${key}: ${scenario.name}`);
      console.log(`      ${scenario.description}`);
      console.log(`      Duration: ${scenario.estimatedDuration}, Tags: ${scenario.tags.join(', ')}`);
      console.log('');
    });

    console.log('📊 Available Profiles:');
    Object.entries(testConfig.profiles).forEach(([key, description]) => {
      console.log(`   ${key}: ${description}`);
    });

    return;
  }

  // Initialize test runner
  const runner = new K6TestRunner({
    k6Binary: options.k6Binary,
    outputDir: options.output,
    ciMode: options.ci,
    verbose: options.verbose,
    detailedMetrics: options.detailed
  });

  // Check dependencies
  if (options.checkDeps || !(await runner.checkK6Installation())) {
    process.exit(1);
  }

  // Ensure output directory
  await runner.ensureOutputDir();

  // Determine scenarios to run
  let scenariosToRun;
  if (options.scenario === 'all') {
    scenariosToRun = Object.keys(testConfig.scenarios);
  } else {
    scenariosToRun = options.scenario.split(',').map(s => s.trim());
  }

  // Validate scenarios
  const invalidScenarios = scenariosToRun.filter(s => !testConfig.scenarios[s]);
  if (invalidScenarios.length > 0) {
    runner.log(`❌ Invalid scenarios: ${invalidScenarios.join(', ')}`, 'error');
    runner.log(`   Available scenarios: ${Object.keys(testConfig.scenarios).join(', ')}`, 'error');
    process.exit(1);
  }

  // Validate profile
  if (!testConfig.profiles[options.profile]) {
    runner.log(`❌ Invalid profile: ${options.profile}`, 'error');
    runner.log(`   Available profiles: ${Object.keys(testConfig.profiles).join(', ')}`, 'error');
    process.exit(1);
  }

  runner.log(`🎯 Starting test suite with ${scenariosToRun.length} scenarios`);
  runner.log(`   Scenarios: ${scenariosToRun.join(', ')}`);
  runner.log(`   Profile: ${options.profile}`);
  runner.log(`   Output: ${options.output}`);
  runner.log(`   Detailed metrics: ${options.detailed ? 'ENABLED (large files)' : 'DISABLED (summary only - saves 90% disk space)'}`);

  // Run scenarios sequentially
  for (const scenario of scenariosToRun) {
    await runner.runScenario(scenario, options.profile);

    // Small delay between scenarios
    if (scenariosToRun.length > 1) {
      runner.log('⏸️  Waiting 30 seconds before next scenario...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  // Generate final report
  const report = await runner.generateReport();

  // Print summary
  runner.log('🏁 Test Suite Complete');
  runner.log(`   Overall Status: ${report.summary.overall.status}`);
  runner.log(`   Success Rate: ${report.summary.overall.successRate}%`);
  runner.log(`   Total Duration: ${report.summary.overall.totalDuration} minutes`);

  if (report.summary.overall.status === 'FAIL') {
    const failedScenarios = report.summary.scenarios.filter(s => s.status === 'FAIL');
    runner.log(`   Failed Scenarios: ${failedScenarios.map(s => s.scenario).join(', ')}`, 'error');
  }

  // Exit with appropriate code
  process.exit(report.summary.overall.status === 'PASS' ? 0 : 1);
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { K6TestRunner, testConfig };
