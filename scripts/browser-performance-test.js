#!/usr/bin/env node

/**
 * Browser-Based Performance Test
 * Simulates real browser loading experience with Puppeteer
 */

const puppeteer = require('puppeteer');
const { performance } = require('perf_hooks');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'calebjmartin@hotmail.com',
  password: '11111111'
};

class BrowserPerformanceTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      auth: null,
      pages: [],
      teamPages: [],
      summary: { total: 0, slow: 0, fast: 0, errors: 0 }
    };
  }

  async init() {
    console.log('🌐 Launching browser for real-world performance testing...');
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    this.page = await this.browser.newPage();
    
    // Enable performance monitoring
    await this.page.setCacheEnabled(false);
    await this.page.setJavaScriptEnabled(true);
  }

  async authenticate() {
    console.log('🔐 Authenticating in browser...');
    
    try {
      // Navigate to login page
      await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
      
      // Fill login form
      await this.page.type('input[type="email"]', TEST_CREDENTIALS.email);
      await this.page.type('input[type="password"]', TEST_CREDENTIALS.password);
      
      // Click login button and wait for navigation
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.page.click('button[type="submit"]')
      ]);
      
      // Verify we're logged in by checking for user elements
      await this.page.waitForSelector('[data-testid="user-menu"], .user-avatar, .profile-menu', { timeout: 10000 });
      
      console.log('✅ Successfully authenticated in browser');
      this.results.auth = { success: true };
      return true;
      
    } catch (error) {
      console.log(`❌ Authentication failed: ${error.message}`);
      this.results.auth = { success: false, error: error.message };
      return false;
    }
  }

  async testPageLoadTime(url, pageName, maxTime = 3000) {
    console.log(`\n📄 Testing ${pageName} page load time...`);
    
    try {
      const startTime = performance.now();
      
      // Navigate to page and wait for it to be fully loaded
      await this.page.goto(`${BASE_URL}${url}`, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Wait for key elements to be visible (simulating real user experience)
      await this.page.waitForSelector('main, [data-testid="main-content"], .main-content', { timeout: 10000 });
      
      // Wait for images to load
      await this.page.waitForFunction(() => {
        const images = document.querySelectorAll('img');
        return Array.from(images).every(img => img.complete);
      }, { timeout: 10000 });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      const isSlow = loadTime > maxTime;
      
      // Get performance metrics
      const metrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.navigationStart
        };
      });
      
      const result = {
        name: pageName,
        url: url,
        loadTime: loadTime,
        domContentLoaded: metrics.domContentLoaded,
        loadComplete: metrics.loadComplete,
        totalTime: metrics.totalTime,
        isSlow,
        performance: isSlow ? 'SLOW' : 'FAST'
      };
      
      this.results.pages.push(result);
      
      const perfColor = isSlow ? '\x1b[31m' : '\x1b[32m';
      console.log(`  ${perfColor}${isSlow ? 'SLOW' : 'FAST'}\x1b[0m ${pageName}: ${Math.round(loadTime)}ms`);
      console.log(`    DOM Content Loaded: ${Math.round(metrics.domContentLoaded)}ms`);
      console.log(`    Load Complete: ${Math.round(metrics.loadComplete)}ms`);
      
      if (isSlow) this.results.summary.slow++;
      else this.results.summary.fast++;
      this.results.summary.total++;
      
      return result;
      
    } catch (error) {
      console.log(`  ❌ ${pageName}: ERROR - ${error.message}`);
      this.results.pages.push({
        name: pageName,
        url: url,
        loadTime: null,
        error: error.message,
        isSlow: true,
        performance: 'ERROR'
      });
      this.results.summary.slow++;
      this.results.summary.errors++;
      this.results.summary.total++;
      return null;
    }
  }

  async testTeamPagePerformance() {
    console.log('\n🏢 Testing Team Page Performance (Real Browser Experience)...');
    
    try {
      // First, navigate to teams list to get a team ID
      await this.page.goto(`${BASE_URL}/teams`, { waitUntil: 'networkidle0' });
      
      // Wait for teams to load
      await this.page.waitForSelector('[data-testid="team-card"], .team-card, a[href*="/teams/"]', { timeout: 10000 });
      
      // Get the first team link
      const teamLink = await this.page.$eval('a[href*="/teams/"]', el => el.href);
      const teamId = teamLink.split('/teams/')[1];
      
      console.log(`📋 Found team: ${teamId}`);
      
      // Test the team page load time
      const result = await this.testPageLoadTime(`/teams/${teamId}`, 'Team Detail Page', 3000);
      
      if (result) {
        // Get additional team-specific metrics
        const teamMetrics = await this.page.evaluate(() => {
          const teamMembers = document.querySelectorAll('[data-testid="team-member"], .team-member');
          const teamProjects = document.querySelectorAll('[data-testid="team-project"], .team-project');
          const teamAchievements = document.querySelectorAll('[data-testid="team-achievement"], .team-achievement');
          
          return {
            memberCount: teamMembers.length,
            projectCount: teamProjects.length,
            achievementCount: teamAchievements.length,
            imagesLoaded: document.querySelectorAll('img').length,
            scriptsLoaded: document.querySelectorAll('script').length
          };
        });
        
        console.log(`  📊 Team Metrics:`);
        console.log(`    Members: ${teamMetrics.memberCount}`);
        console.log(`    Projects: ${teamMetrics.projectCount}`);
        console.log(`    Achievements: ${teamMetrics.achievementCount}`);
        console.log(`    Images: ${teamMetrics.imagesLoaded}`);
        console.log(`    Scripts: ${teamMetrics.scriptsLoaded}`);
        
        this.results.teamPages.push({
          ...result,
          teamId,
          teamMetrics
        });
      }
      
    } catch (error) {
      console.log(`❌ Team page test failed: ${error.message}`);
    }
  }

  async testNetworkPerformance() {
    console.log('\n🌐 Testing Network Performance...');
    
    try {
      // Enable network monitoring
      const requests = [];
      const responses = [];
      
      this.page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: performance.now()
        });
      });
      
      this.page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          timestamp: performance.now()
        });
      });
      
      // Navigate to a team page to capture network activity
      await this.page.goto(`${BASE_URL}/teams`, { waitUntil: 'networkidle0' });
      
      // Wait a bit for all requests to complete
      await this.page.waitForTimeout(2000);
      
      console.log(`  📊 Network Analysis:`);
      console.log(`    Total Requests: ${requests.length}`);
      console.log(`    Total Responses: ${responses.length}`);
      
      // Analyze API calls
      const apiCalls = requests.filter(req => req.url.includes('/api/'));
      console.log(`    API Calls: ${apiCalls.length}`);
      
      // Analyze image requests
      const imageRequests = requests.filter(req => 
        req.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
      );
      console.log(`    Image Requests: ${imageRequests.length}`);
      
      // Find slow requests
      const slowRequests = responses.filter(resp => {
        const request = requests.find(req => req.url === resp.url);
        if (request) {
          const duration = resp.timestamp - request.timestamp;
          return duration > 1000; // More than 1 second
        }
        return false;
      });
      
      if (slowRequests.length > 0) {
        console.log(`    Slow Requests (>1s): ${slowRequests.length}`);
        slowRequests.forEach(req => {
          console.log(`      - ${req.url}: ${Math.round(req.timestamp - requests.find(r => r.url === req.url)?.timestamp || 0)}ms`);
        });
      }
      
    } catch (error) {
      console.log(`❌ Network performance test failed: ${error.message}`);
    }
  }

  async generateBrowserReport() {
    console.log('\n📊 BROWSER PERFORMANCE REPORT:');
    console.log('='.repeat(50));
    
    const slowPages = this.results.pages.filter(p => p.isSlow);
    const slowTeams = this.results.teamPages.filter(t => t.isSlow);
    
    console.log(`\n📄 PAGE PERFORMANCE:`);
    this.results.pages.forEach(page => {
      const color = page.isSlow ? '\x1b[31m' : '\x1b[32m';
      console.log(`  ${color}${page.performance}\x1b[0m ${page.name}: ${Math.round(page.loadTime || 0)}ms`);
    });
    
    if (slowPages.length > 0) {
      console.log(`\n🐌 SLOW PAGES (${slowPages.length}):`);
      slowPages.forEach(page => {
        console.log(`  - ${page.name}: ${Math.round(page.loadTime || 0)}ms`);
        console.log(`    DOM Content Loaded: ${Math.round(page.domContentLoaded || 0)}ms`);
        console.log(`    Load Complete: ${Math.round(page.loadComplete || 0)}ms`);
      });
    }
    
    if (slowTeams.length > 0) {
      console.log(`\n🏢 SLOW TEAM PAGES (${slowTeams.length}):`);
      slowTeams.forEach(team => {
        console.log(`  - Team ${team.teamId}: ${Math.round(team.loadTime || 0)}ms`);
        console.log(`    Members: ${team.teamMetrics?.memberCount || 0}`);
        console.log(`    Projects: ${team.teamMetrics?.projectCount || 0}`);
        console.log(`    Images: ${team.teamMetrics?.imagesLoaded || 0}`);
      });
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`  Total pages tested: ${this.results.summary.total}`);
    console.log(`  Fast: ${this.results.summary.fast}`);
    console.log(`  Slow: ${this.results.summary.slow}`);
    console.log(`  Errors: ${this.results.summary.errors}`);
    
    if (this.results.summary.total > 0) {
      const slowPercentage = Math.round((this.results.summary.slow / this.results.summary.total) * 100);
      console.log(`  Slow percentage: ${slowPercentage}%`);
    }
    
    console.log('\n🎯 BROWSER-SPECIFIC OPTIMIZATIONS:');
    console.log('  • Optimize image loading with lazy loading');
    console.log('  • Implement code splitting for team components');
    console.log('  • Use React.memo for team member components');
    console.log('  • Add loading states for better perceived performance');
    console.log('  • Implement service worker caching');
    console.log('  • Optimize database queries for team data');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        console.log('❌ Cannot proceed without authentication');
        return;
      }
      
      // Test various pages
      await this.testPageLoadTime('/', 'Home', 2000);
      await this.testPageLoadTime('/feed', 'Feed', 3000);
      await this.testPageLoadTime('/teams', 'Teams List', 2500);
      await this.testPageLoadTime('/projects', 'Projects', 2500);
      await this.testPageLoadTime('/events', 'Events', 2500);
      await this.testPageLoadTime('/news', 'News', 3000);
      
      // Test team page specifically
      await this.testTeamPagePerformance();
      
      // Test network performance
      await this.testNetworkPerformance();
      
      // Generate report
      await this.generateBrowserReport();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new BrowserPerformanceTest();
  tester.run().catch(console.error);
}

module.exports = BrowserPerformanceTest;
