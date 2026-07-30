/**
 * Lighthouse Performance Audit Script
 * 
 * Validates:
 * - Performance score > 90
 * - TTI (Time to Interactive) < 2s
 * - First Contentful Paint < 1.5s
 * - Largest Contentful Paint < 2.5s
 * - Cumulative Layout Shift < 0.1
 * - Total Blocking Time < 300ms
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Lighthouse configuration
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    throttling: {
      // Mobile 3G simulation
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      cpuSlowdownMultiplier: 4,
    },
  },
};

// URLs to audit
const urls = [
  {
    name: 'Movie Details (No Reviews)',
    url: 'http://localhost:3000/movies/550',
  },
  {
    name: 'Movie Details (With 100 Reviews)',
    url: 'http://localhost:3000/movies/550?mockReviews=100',
  },
  {
    name: 'Movie Details (With 500 Reviews)',
    url: 'http://localhost:3000/movies/550?mockReviews=500',
  },
];

// Performance thresholds
const thresholds = {
  performance: 90,
  accessibility: 90,
  bestPractices: 90,
  
  // Core Web Vitals
  tti: 2000,              // Time to Interactive < 2s
  fcp: 1500,              // First Contentful Paint < 1.5s
  lcp: 2500,              // Largest Contentful Paint < 2.5s
  cls: 0.1,               // Cumulative Layout Shift < 0.1
  tbt: 300,               // Total Blocking Time < 300ms
  speedIndex: 3000,       // Speed Index < 3s
};

async function runLighthouse(url, name) {
  console.log(`\n🚀 Running Lighthouse audit for: ${name}`);
  console.log(`   URL: ${url}\n`);
  
  // Launch Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });
  
  try {
    // Run Lighthouse
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      ...config,
    });
    
    // Extract scores
    const { lhr } = runnerResult;
    const scores = {
      performance: lhr.categories.performance.score * 100,
      accessibility: lhr.categories.accessibility.score * 100,
      bestPractices: lhr.categories['best-practices'].score * 100,
    };
    
    // Extract metrics
    const metrics = {
      tti: lhr.audits.interactive.numericValue,
      fcp: lhr.audits['first-contentful-paint'].numericValue,
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      tbt: lhr.audits['total-blocking-time'].numericValue,
      speedIndex: lhr.audits['speed-index'].numericValue,
    };
    
    // Print results
    console.log('📊 Scores:');
    console.log(`   Performance:    ${scores.performance.toFixed(1)} / 100 ${scores.performance >= thresholds.performance ? '✅' : '❌'}`);
    console.log(`   Accessibility:  ${scores.accessibility.toFixed(1)} / 100 ${scores.accessibility >= thresholds.accessibility ? '✅' : '❌'}`);
    console.log(`   Best Practices: ${scores.bestPractices.toFixed(1)} / 100 ${scores.bestPractices >= thresholds.bestPractices ? '✅' : '❌'}`);
    
    console.log('\n⏱️  Core Web Vitals:');
    console.log(`   TTI (Time to Interactive):     ${(metrics.tti / 1000).toFixed(2)}s ${metrics.tti <= thresholds.tti ? '✅' : '❌'} (target: < ${thresholds.tti / 1000}s)`);
    console.log(`   FCP (First Contentful Paint):  ${(metrics.fcp / 1000).toFixed(2)}s ${metrics.fcp <= thresholds.fcp ? '✅' : '❌'} (target: < ${thresholds.fcp / 1000}s)`);
    console.log(`   LCP (Largest Contentful Paint): ${(metrics.lcp / 1000).toFixed(2)}s ${metrics.lcp <= thresholds.lcp ? '✅' : '❌'} (target: < ${thresholds.lcp / 1000}s)`);
    console.log(`   CLS (Cumulative Layout Shift):  ${metrics.cls.toFixed(3)} ${metrics.cls <= thresholds.cls ? '✅' : '❌'} (target: < ${thresholds.cls})`);
    console.log(`   TBT (Total Blocking Time):      ${metrics.tbt.toFixed(0)}ms ${metrics.tbt <= thresholds.tbt ? '✅' : '❌'} (target: < ${thresholds.tbt}ms)`);
    console.log(`   Speed Index:                     ${(metrics.speedIndex / 1000).toFixed(2)}s ${metrics.speedIndex <= thresholds.speedIndex ? '✅' : '❌'} (target: < ${thresholds.speedIndex / 1000}s)`);
    
    // Save detailed report
    const reportDir = path.join(__dirname, 'lighthouse-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, `${name.replace(/\s+/g, '-').toLowerCase()}.html`);
    fs.writeFileSync(reportPath, lhr.report);
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    
    // Check if all thresholds pass
    const allPassed = 
      scores.performance >= thresholds.performance &&
      scores.accessibility >= thresholds.accessibility &&
      scores.bestPractices >= thresholds.bestPractices &&
      metrics.tti <= thresholds.tti &&
      metrics.fcp <= thresholds.fcp &&
      metrics.lcp <= thresholds.lcp &&
      metrics.cls <= thresholds.cls &&
      metrics.tbt <= thresholds.tbt &&
      metrics.speedIndex <= thresholds.speedIndex;
    
    return {
      name,
      url,
      scores,
      metrics,
      passed: allPassed,
    };
    
  } finally {
    await chrome.kill();
  }
}

async function runAllAudits() {
  console.log('🔍 Lighthouse Performance Audit');
  console.log('================================\n');
  console.log('Testing review system performance with various loads...\n');
  
  const results = [];
  
  for (const { url, name } of urls) {
    try {
      const result = await runAllAudits(url, name);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error auditing ${name}:`, error.message);
      results.push({
        name,
        url,
        passed: false,
        error: error.message,
      });
    }
  }
  
  // Summary
  console.log('\n\n📊 AUDIT SUMMARY');
  console.log('================\n');
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.name}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else if (result.metrics) {
      console.log(`   TTI: ${(result.metrics.tti / 1000).toFixed(2)}s | Performance Score: ${result.scores.performance.toFixed(1)}`);
    }
  });
  
  console.log(`\n${passedCount}/${totalCount} audits passed\n`);
  
  // Exit with error if any failed
  if (passedCount < totalCount) {
    process.exit(1);
  }
}

// Run audits if called directly
if (require.main === module) {
  runAllAudits().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runLighthouse, thresholds };
