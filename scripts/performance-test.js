#!/usr/bin/env node

/**
 * Performance Testing Script for Web3Recap
 * Measures page load times and API response times
 */

const { performance } = require('perf_hooks');
const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test pages and their expected load times
const PAGES = [
  { path: '/', name: 'Home', maxTime: 2000 },
  { path: '/feed', name: 'Feed', maxTime: 3000 },
  { path: '/teams', name: 'Teams List', maxTime: 2500 },
  { path: '/projects', name: 'Projects', maxTime: 2500 },
  { path: '/events', name: 'Events', maxTime: 2500 },
  { path: '/news', name: 'News', maxTime: 2000 },
];

// API endpoints to test
const API_ENDPOINTS = [
  { path: '/users/me', name: 'User Profile', maxTime: 1000, requiresAuth: true },
  { path: '/teams', name: 'Teams List API', maxTime: 1500, requiresAuth: true },
  { path: '/projects', name: 'Projects API', maxTime: 1500, requiresAuth: true },
  { path: '/events', name: 'Events API', maxTime: 1500, requiresAuth: false },
  { path: '/news', name: 'News API', maxTime: 1000, requiresAuth: false },
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class PerformanceTester {
  constructor() {
    this.results = {
      pages: [],
      apis: [],
      summary: { total: 0, slow: 0, fast: 0 }
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.request(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Performance-Test/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...options.headers
        },
        timeout: 10000
      }, (res) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            duration,
            size: data.length,
            headers: res.headers
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async testPage(page) {
    console.log(`${colors.blue}Testing ${page.name}...${colors.reset}`);
    
    try {
      const result = await this.makeRequest(`${BASE_URL}${page.path}`);
      const isSlow = result.duration > page.maxTime;
      
      this.results.pages.push({
        ...page,
        duration: result.duration,
        status: result.status,
        size: result.size,
        isSlow,
        performance: isSlow ? 'SLOW' : 'FAST'
      });

      const statusColor = result.status === 200 ? colors.green : colors.red;
      const perfColor = isSlow ? colors.red : colors.green;
      
      console.log(`  ${statusColor}✓${colors.reset} ${page.name}: ${Math.round(result.duration)}ms ${perfColor}(${isSlow ? 'SLOW' : 'FAST'})${colors.reset}`);
      
      if (isSlow) this.results.summary.slow++;
      else this.results.summary.fast++;
      
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} ${page.name}: ERROR - ${error.message}`);
      this.results.pages.push({
        ...page,
        duration: null,
        status: 'ERROR',
        error: error.message,
        isSlow: true,
        performance: 'ERROR'
      });
      this.results.summary.slow++;
    }
  }

  async testAPI(endpoint) {
    console.log(`${colors.blue}Testing ${endpoint.name} API...${colors.reset}`);
    
    try {
      const result = await this.makeRequest(`${API_BASE}${endpoint.path}`);
      
      // Handle authentication required
      if (result.status === 401 && endpoint.requiresAuth) {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${endpoint.name}: Authentication required (expected)`);
        this.results.apis.push({
          ...endpoint,
          duration: result.duration,
          status: result.status,
          size: result.size,
          isSlow: false,
          performance: 'AUTH_REQUIRED'
        });
        this.results.summary.fast++;
        return;
      }
      
      const isSlow = result.duration > endpoint.maxTime;
      
      this.results.apis.push({
        ...endpoint,
        duration: result.duration,
        status: result.status,
        size: result.size,
        isSlow,
        performance: isSlow ? 'SLOW' : 'FAST'
      });

      const statusColor = result.status === 200 ? colors.green : colors.red;
      const perfColor = isSlow ? colors.red : colors.green;
      
      console.log(`  ${statusColor}✓${colors.reset} ${endpoint.name}: ${Math.round(result.duration)}ms ${perfColor}(${isSlow ? 'SLOW' : 'FAST'})${colors.reset}`);
      
      if (isSlow) this.results.summary.slow++;
      else this.results.summary.fast++;
      
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} ${endpoint.name}: ERROR - ${error.message}`);
      this.results.apis.push({
        ...endpoint,
        duration: null,
        status: 'ERROR',
        error: error.message,
        isSlow: true,
        performance: 'ERROR'
      });
      this.results.summary.slow++;
    }
  }

  printSummary() {
    console.log(`\n${colors.bold}${colors.blue}=== PERFORMANCE TEST SUMMARY ===${colors.reset}`);
    
    // Pages summary
    console.log(`\n${colors.bold}PAGES:${colors.reset}`);
    this.results.pages.forEach(page => {
      const color = page.isSlow ? colors.red : colors.green;
      const duration = page.duration ? `${Math.round(page.duration)}ms` : 'ERROR';
      console.log(`  ${color}${page.performance}${colors.reset} ${page.name}: ${duration}`);
    });

    // APIs summary
    console.log(`\n${colors.bold}APIS:${colors.reset}`);
    this.results.apis.forEach(api => {
      const color = api.isSlow ? colors.red : colors.green;
      const duration = api.duration ? `${Math.round(api.duration)}ms` : 'ERROR';
      console.log(`  ${color}${api.performance}${colors.reset} ${api.name}: ${duration}`);
    });

    // Overall stats
    const total = this.results.summary.fast + this.results.summary.slow;
    const slowPercentage = total > 0 ? Math.round((this.results.summary.slow / total) * 100) : 0;
    
    console.log(`\n${colors.bold}OVERALL:${colors.reset}`);
    console.log(`  Total tests: ${total}`);
    console.log(`  Fast: ${colors.green}${this.results.summary.fast}${colors.reset}`);
    console.log(`  Slow: ${colors.red}${this.results.summary.slow}${colors.reset}`);
    console.log(`  Slow percentage: ${colors.yellow}${slowPercentage}%${colors.reset}`);

    // Recommendations
    if (this.results.summary.slow > 0) {
      console.log(`\n${colors.yellow}${colors.bold}RECOMMENDATIONS:${colors.reset}`);
      
      const slowPages = this.results.pages.filter(p => p.isSlow);
      const slowAPIs = this.results.apis.filter(a => a.isSlow);
      
      if (slowPages.length > 0) {
        console.log(`  ${colors.red}Slow Pages:${colors.reset}`);
        slowPages.forEach(page => {
          console.log(`    - ${page.name}: Consider code splitting, lazy loading, or reducing bundle size`);
        });
      }
      
      if (slowAPIs.length > 0) {
        console.log(`  ${colors.red}Slow APIs:${colors.reset}`);
        slowAPIs.forEach(api => {
          console.log(`    - ${api.name}: Consider database optimization, caching, or pagination`);
        });
      }
    }
  }

  async run() {
    console.log(`${colors.bold}${colors.blue}🚀 Starting Performance Test...${colors.reset}\n`);
    console.log(`Testing against: ${BASE_URL}\n`);

    // Test pages
    console.log(`${colors.bold}Testing Pages:${colors.reset}`);
    for (const page of PAGES) {
      await this.testPage(page);
    }

    // Test APIs
    console.log(`\n${colors.bold}Testing APIs:${colors.reset}`);
    for (const endpoint of API_ENDPOINTS) {
      await this.testAPI(endpoint);
    }

    // Print summary
    this.printSummary();
  }
}

// Run the test
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.run().catch(console.error);
}

module.exports = PerformanceTester;
