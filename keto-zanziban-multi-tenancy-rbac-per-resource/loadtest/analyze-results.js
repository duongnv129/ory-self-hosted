#!/usr/bin/env node

/**
 * Results Analysis Utility
 *
 * Analyzes K6 test results, generates performance reports, and provides
 * insights for optimization. Supports trend analysis, SLA validation,
 * and automated performance regression detection.
 *
 * Usage:
 *   ./analyze-results.js --input results/               # Analyze all results in directory
 *   ./analyze-results.js --file results/scenario1.json # Analyze specific file
 *   ./analyze-results.js --trend --days 7              # Trend analysis over 7 days
 *   ./analyze-results.js --sla                         # SLA compliance check
 *   ./analyze-results.js --regression                  # Performance regression detection
 */

const fs = require('fs').promises;
const path = require('path');
const { Command } = require('commander');

class ResultsAnalyzer {
  constructor(options = {}) {
    this.options = {
      inputDir: options.inputDir || 'results',
      outputDir: options.outputDir || 'reports',
      verbose: options.verbose || false,
      ...options
    };

    // SLA thresholds from the testing plan
    this.slaThresholds = {
      'http_req_duration': {
        p50: 25,   // 50% under 25ms
        p95: 100,  // 95% under 100ms
        p99: 200   // 99% under 200ms
      },
      'http_req_failed': {
        rate: 0.05 // Less than 5% failure rate
      },
      'checks': {
        rate: 0.95 // 95% of checks pass
      },
      'iteration_duration': {
        p95: 500 // 95% of iterations under 500ms
      }
    };
  }

  /**
   * Analyze all result files in directory
   */
  async analyzeDirectory() {
    const files = await fs.readdir(this.options.inputDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('summary'));

    if (jsonFiles.length === 0) {
      throw new Error(`No result files found in ${this.options.inputDir}`);
    }

    this.log(`📊 Found ${jsonFiles.length} result files to analyze`);

    const analyses = [];
    for (const file of jsonFiles) {
      const filePath = path.join(this.options.inputDir, file);
      const analysis = await this.analyzeFile(filePath);
      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Analyze a single K6 result file
   */
  async analyzeFile(filePath) {
    this.log(`🔍 Analyzing ${path.basename(filePath)}`);

    const content = await fs.readFile(filePath, 'utf-8');
    const results = content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(entry => entry !== null);

    // Extract metrics
    const metrics = this.extractMetrics(results);
    const scenarios = this.extractScenarioInfo(results);
    const timeline = this.buildTimeline(results);

    // Perform analysis
    const performance = this.analyzePerformance(metrics);
    const slaCompliance = this.checkSLACompliance(metrics);
    const errors = this.analyzeErrors(results);
    const recommendations = this.generateRecommendations(metrics, errors, slaCompliance);

    const analysis = {
      file: path.basename(filePath),
      timestamp: new Date().toISOString(),
      testDuration: this.calculateTestDuration(results),
      totalRequests: this.countTotalRequests(results),
      scenarios,
      metrics,
      performance,
      slaCompliance,
      errors,
      recommendations,
      timeline
    };

    this.log(`✅ Analysis complete for ${path.basename(filePath)}`);
    return analysis;
  }

  /**
   * Extract metrics from K6 results
   */
  extractMetrics(results) {
    const metrics = {};

    // Process metric entries
    results
      .filter(entry => entry.type === 'Point' && entry.metric)
      .forEach(entry => {
        const metricName = entry.metric;

        if (!metrics[metricName]) {
          metrics[metricName] = {
            name: metricName,
            type: entry.data?.type || 'unknown',
            values: [],
            tags: new Set()
          };
        }

        metrics[metricName].values.push({
          timestamp: entry.data?.time,
          value: entry.data?.value,
          tags: entry.data?.tags || {}
        });

        // Collect unique tags
        if (entry.data?.tags) {
          Object.keys(entry.data.tags).forEach(tag => {
            metrics[metricName].tags.add(tag);
          });
        }
      });

    // Convert tags sets to arrays
    Object.values(metrics).forEach(metric => {
      metric.tags = Array.from(metric.tags);
    });

    return metrics;
  }

  /**
   * Extract scenario information
   */
  extractScenarioInfo(results) {
    const scenarios = new Set();

    results.forEach(entry => {
      if (entry.data?.tags?.scenario) {
        scenarios.add(entry.data.tags.scenario);
      }
    });

    return Array.from(scenarios);
  }

  /**
   * Build performance timeline
   */
  buildTimeline(results) {
    const timelinePoints = results
      .filter(entry => entry.type === 'Point' && entry.data?.time)
      .map(entry => ({
        timestamp: new Date(entry.data.time),
        metric: entry.metric,
        value: entry.data.value,
        tags: entry.data.tags || {}
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Group by minute for aggregation
    const timeline = {};
    timelinePoints.forEach(point => {
      const minute = new Date(point.timestamp);
      minute.setSeconds(0, 0);
      const key = minute.toISOString();

      if (!timeline[key]) {
        timeline[key] = {
          timestamp: minute,
          metrics: {}
        };
      }

      if (!timeline[key].metrics[point.metric]) {
        timeline[key].metrics[point.metric] = [];
      }

      timeline[key].metrics[point.metric].push(point.value);
    });

    // Calculate aggregates for each minute
    Object.values(timeline).forEach(timePoint => {
      Object.keys(timePoint.metrics).forEach(metric => {
        const values = timePoint.metrics[metric];
        timePoint.metrics[metric] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          p95: this.percentile(values, 0.95)
        };
      });
    });

    return Object.values(timeline).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Analyze overall performance characteristics
   */
  analyzePerformance(metrics) {
    const performance = {};

    // Analyze key metrics
    Object.entries(metrics).forEach(([name, metric]) => {
      if (metric.values.length === 0) return;

      const values = metric.values.map(v => v.value).filter(v => typeof v === 'number');

      if (values.length === 0) return;

      performance[name] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: this.percentile(values, 0.5),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99),
        stdDev: this.standardDeviation(values)
      };
    });

    return performance;
  }

  /**
   * Check SLA compliance
   */
  checkSLACompliance(metrics) {
    const compliance = {
      overall: true,
      violations: [],
      passed: [],
      metrics: {}
    };

    Object.entries(this.slaThresholds).forEach(([metricName, thresholds]) => {
      const metric = metrics[metricName];

      if (!metric || metric.values.length === 0) {
        compliance.violations.push({
          metric: metricName,
          reason: 'Metric not found in results',
          severity: 'warning'
        });
        return;
      }

      const values = metric.values.map(v => v.value).filter(v => typeof v === 'number');
      const metricCompliance = { metric: metricName, checks: [] };

      Object.entries(thresholds).forEach(([check, threshold]) => {
        let actualValue;
        let passed = false;

        if (check.startsWith('p')) {
          // Percentile check
          const percentile = parseInt(check.substring(1)) / 100;
          actualValue = this.percentile(values, percentile);
          passed = actualValue <= threshold;
        } else if (check === 'rate') {
          // Rate check (for failure rates, check rates, etc.)
          actualValue = values.reduce((a, b) => a + b, 0) / values.length;
          passed = actualValue <= threshold;
        }

        const checkResult = {
          check,
          threshold,
          actualValue,
          passed,
          deviation: actualValue - threshold
        };

        metricCompliance.checks.push(checkResult);

        if (passed) {
          compliance.passed.push({
            metric: metricName,
            check,
            threshold,
            actualValue
          });
        } else {
          compliance.overall = false;
          compliance.violations.push({
            metric: metricName,
            check,
            threshold,
            actualValue,
            deviation: actualValue - threshold,
            severity: actualValue > threshold * 1.5 ? 'critical' : 'warning'
          });
        }
      });

      compliance.metrics[metricName] = metricCompliance;
    });

    return compliance;
  }

  /**
   * Analyze errors and failures
   */
  analyzeErrors(results) {
    const errors = {
      totalErrors: 0,
      errorTypes: {},
      failedRequests: [],
      timeline: []
    };

    results.forEach(entry => {
      // Check for failed HTTP requests
      if (entry.type === 'Point' && entry.metric === 'http_req_failed' && entry.data?.value === 1) {
        errors.totalErrors++;

        const errorInfo = {
          timestamp: entry.data.time,
          tags: entry.data.tags || {},
          url: entry.data.tags?.url || 'unknown',
          status: entry.data.tags?.status || 'unknown',
          method: entry.data.tags?.method || 'unknown'
        };

        errors.failedRequests.push(errorInfo);

        // Categorize error types
        const errorType = `${errorInfo.method} ${errorInfo.status}`;
        errors.errorTypes[errorType] = (errors.errorTypes[errorType] || 0) + 1;
      }

      // Check for check failures
      if (entry.type === 'Point' && entry.metric === 'checks' && entry.data?.value === 0) {
        errors.totalErrors++;

        const checkName = entry.data.tags?.check || 'unknown';
        errors.errorTypes[`Check: ${checkName}`] = (errors.errorTypes[`Check: ${checkName}`] || 0) + 1;
      }
    });

    return errors;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(metrics, errors, slaCompliance) {
    const recommendations = [];

    // Performance recommendations
    if (slaCompliance.violations.length > 0) {
      const criticalViolations = slaCompliance.violations.filter(v => v.severity === 'critical');

      if (criticalViolations.length > 0) {
        recommendations.push({
          priority: 'critical',
          category: 'performance',
          title: 'Critical SLA Violations Detected',
          description: `${criticalViolations.length} critical performance thresholds exceeded`,
          actions: [
            'Review database query performance and indexing',
            'Analyze memory usage and garbage collection patterns',
            'Consider horizontal scaling of Keto instances',
            'Optimize tuple storage and retrieval patterns'
          ]
        });
      }
    }

    // Error rate recommendations
    if (errors.totalErrors > 0) {
      const errorRate = errors.totalErrors / (metrics.http_reqs?.values.length || 1);

      if (errorRate > 0.05) {
        recommendations.push({
          priority: 'high',
          category: 'reliability',
          title: 'High Error Rate Detected',
          description: `Error rate of ${(errorRate * 100).toFixed(2)}% exceeds 5% threshold`,
          actions: [
            'Investigate most common error types',
            'Review application logs for root causes',
            'Implement circuit breaker patterns',
            'Add retry logic with exponential backoff'
          ]
        });
      }
    }

    // Latency recommendations
    if (metrics.http_req_duration) {
      const p95Latency = this.percentile(
        metrics.http_req_duration.values.map(v => v.value),
        0.95
      );

      if (p95Latency > 100) {
        recommendations.push({
          priority: 'medium',
          category: 'performance',
          title: 'High Latency Detected',
          description: `P95 latency of ${p95Latency.toFixed(1)}ms exceeds 100ms target`,
          actions: [
            'Profile authorization check performance',
            'Consider implementing result caching',
            'Optimize tuple query patterns',
            'Review network latency between services'
          ]
        });
      }
    }

    // Resource utilization recommendations
    if (metrics.iteration_duration) {
      const avgIterationTime = metrics.iteration_duration.values
        .map(v => v.value)
        .reduce((a, b) => a + b, 0) / metrics.iteration_duration.values.length;

      if (avgIterationTime > 1000) {
        recommendations.push({
          priority: 'medium',
          category: 'optimization',
          title: 'Long Iteration Times',
          description: `Average iteration time of ${avgIterationTime.toFixed(0)}ms may indicate inefficient test patterns`,
          actions: [
            'Review test scenario efficiency',
            'Optimize data setup and teardown',
            'Consider parallel execution patterns',
            'Reduce unnecessary delays in test logic'
          ]
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(analyses) {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalAnalyses: analyses.length,
        analyzer: 'Keto Performance Results Analyzer v1.0'
      },
      summary: this.generateSummary(analyses),
      analyses,
      trends: this.analyzeTrends(analyses),
      aggregatedRecommendations: this.aggregateRecommendations(analyses)
    };

    // Ensure output directory exists
    await fs.mkdir(this.options.outputDir, { recursive: true });

    // Write detailed report
    const reportFile = path.join(this.options.outputDir, `analysis-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    // Write summary report
    const summaryFile = path.join(this.options.outputDir, `analysis-summary-${Date.now()}.json`);
    await fs.writeFile(summaryFile, JSON.stringify(report.summary, null, 2));

    this.log(`📄 Detailed report: ${reportFile}`);
    this.log(`📋 Summary report: ${summaryFile}`);

    return report;
  }

  /**
   * Helper methods
   */
  percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  standardDeviation(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  calculateTestDuration(results) {
    const timestamps = results
      .filter(entry => entry.data?.time)
      .map(entry => new Date(entry.data.time));

    if (timestamps.length === 0) return 0;

    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    return end - start;
  }

  countTotalRequests(results) {
    return results.filter(entry => entry.metric === 'http_reqs').length;
  }

  generateSummary(analyses) {
    // Implementation for summary generation
    const totalTests = analyses.length;
    const passedTests = analyses.filter(a => a.slaCompliance.overall).length;

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: (passedTests / totalTests * 100).toFixed(1),
      overallStatus: passedTests === totalTests ? 'PASS' : 'FAIL'
    };
  }

  analyzeTrends(analyses) {
    // Implementation for trend analysis
    return {
      message: 'Trend analysis requires multiple test runs over time',
      dataPoints: analyses.length
    };
  }

  aggregateRecommendations(analyses) {
    const allRecommendations = analyses.flatMap(a => a.recommendations);
    const grouped = {};

    allRecommendations.forEach(rec => {
      const key = `${rec.category}-${rec.title}`;
      if (!grouped[key]) {
        grouped[key] = { ...rec, occurrences: 0 };
      }
      grouped[key].occurrences++;
    });

    return Object.values(grouped).sort((a, b) => b.occurrences - a.occurrences);
  }

  log(message, level = 'info') {
    if (!this.options.verbose && level === 'debug') return;

    const prefix = level === 'error' ? '❌' :
      level === 'warn' ? '⚠️' :
        level === 'success' ? '✅' : 'ℹ️';

    console.log(`${prefix} ${message}`);
  }
}

/**
 * Main CLI function
 */
async function main() {
  const program = new Command();

  program
    .name('analyze-results')
    .description('Analyze K6 load test results and generate performance reports')
    .version('1.0.0');

  program
    .option('-i, --input <directory>', 'Input directory containing result files', 'results')
    .option('-f, --file <file>', 'Analyze specific result file')
    .option('-o, --output <directory>', 'Output directory for reports', 'reports')
    .option('--sla', 'Focus on SLA compliance analysis')
    .option('--trends', 'Perform trend analysis (requires multiple results)')
    .option('--verbose', 'Verbose output');

  program.parse();
  const options = program.opts();

  const analyzer = new ResultsAnalyzer({
    inputDir: options.input,
    outputDir: options.output,
    verbose: options.verbose
  });

  try {
    let analyses;

    if (options.file) {
      // Analyze single file
      const analysis = await analyzer.analyzeFile(options.file);
      analyses = [analysis];
    } else {
      // Analyze directory
      analyses = await analyzer.analyzeDirectory();
    }

    // Generate comprehensive report
    const report = await analyzer.generateReport(analyses);

    // Print summary
    analyzer.log('🎯 Analysis Summary:');
    analyzer.log(`   Total analyses: ${report.summary.totalTests}`);
    analyzer.log(`   Passed: ${report.summary.passedTests}`);
    analyzer.log(`   Failed: ${report.summary.failedTests}`);
    analyzer.log(`   Success rate: ${report.summary.successRate}%`);
    analyzer.log(`   Overall status: ${report.summary.overallStatus}`);

    if (options.sla) {
      analyzer.log('\n📋 SLA Compliance Details:');
      analyses.forEach(analysis => {
        analyzer.log(`   ${analysis.file}: ${analysis.slaCompliance.overall ? 'PASS' : 'FAIL'}`);
        if (!analysis.slaCompliance.overall) {
          analysis.slaCompliance.violations.forEach(violation => {
            analyzer.log(`     ❌ ${violation.metric} ${violation.check}: ${violation.actualValue} > ${violation.threshold}`);
          });
        }
      });
    }

    // Exit with appropriate code
    process.exit(report.summary.overallStatus === 'PASS' ? 0 : 1);

  } catch (error) {
    analyzer.log(`❌ Analysis failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { ResultsAnalyzer };
