#!/usr/bin/env node

/**
 * Simple Browser Performance Test
 * Uses Node.js to simulate browser requests and measure real-world performance
 */

const { performance } = require('perf_hooks');
const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_CREDENTIALS = {
  email: 'calebjmartin@hotmail.com',
  password: '11111111'
};

class SimpleBrowserPerformanceTest {
  constructor() {
    this.authCookies = null;
    this.userId = null;
    this.results = {
      auth: null,
      pages: [],
      teamPages: [],
      networkRequests: [],
      summary: { total: 0, slow: 0, fast: 0, errors: 0 }
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.request(url, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cookie': this.authCookies || '',
          ...options.headers
        },
        timeout: 30000
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
            headers: res.headers,
            url: url,
            contentType: res.headers['content-type'] || 'unknown'
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  async authenticate() {
    console.log('🔐 Authenticating for browser simulation...');
    
    try {
      const loginResult = await this.makeRequest(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: TEST_CREDENTIALS
      });

      if (loginResult.status === 200) {
        const setCookieHeader = loginResult.headers['set-cookie'];
        if (setCookieHeader) {
          this.authCookies = Array.isArray(setCookieHeader) 
            ? setCookieHeader.join('; ') 
            : setCookieHeader;
        }

        console.log('✅ Successfully authenticated');
        this.results.auth = { success: true, duration: loginResult.duration };
        return true;
      }
      
      console.log(`❌ Authentication failed: Status ${loginResult.status}`);
      this.results.auth = { success: false, error: `Status ${loginResult.status}` };
      return false;
      
    } catch (error) {
      console.log(`❌ Authentication error: ${error.message}`);
      this.results.auth = { success: false, error: error.message };
      return false;
    }
  }

  async testPageLoadTime(url, pageName, maxTime = 3000) {
    console.log(`\n📄 Testing ${pageName} page load time (browser simulation)...`);
    
    try {
      const startTime = performance.now();
      
      // Simulate browser loading the page
      const result = await this.makeRequest(`${BASE_URL}${url}`);
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      const isSlow = loadTime > maxTime;
      
      // Analyze the response
      const isHTML = result.contentType.includes('text/html');
      const hasImages = result.size > 0 && (result.size.toString().includes('<img') || result.size.toString().includes('background-image'));
      const hasScripts = result.size > 0 && result.size.toString().includes('<script');
      const hasCSS = result.size > 0 && (result.size.toString().includes('<link') || result.size.toString().includes('<style'));
      
      const analysis = {
        name: pageName,
        url: url,
        loadTime: loadTime,
        status: result.status,
        size: result.size,
        isHTML,
        hasImages,
        hasScripts,
        hasCSS,
        isSlow,
        performance: isSlow ? 'SLOW' : 'FAST'
      };
      
      this.results.pages.push(analysis);
      
      const perfColor = isSlow ? '\x1b[31m' : '\x1b[32m';
      console.log(`  ${perfColor}${isSlow ? 'SLOW' : 'FAST'}\x1b[0m ${pageName}: ${Math.round(loadTime)}ms`);
      console.log(`    Status: ${result.status}`);
      console.log(`    Size: ${Math.round(result.size/1024)}KB`);
      console.log(`    HTML: ${isHTML ? 'Yes' : 'No'}`);
      console.log(`    Images: ${hasImages ? 'Yes' : 'No'}`);
      console.log(`    Scripts: ${hasScripts ? 'Yes' : 'No'}`);
      console.log(`    CSS: ${hasCSS ? 'Yes' : 'No'}`);
      
      if (isSlow) this.results.summary.slow++;
      else this.results.summary.fast++;
      this.results.summary.total++;
      
      return analysis;
      
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
    console.log('\n🏢 Testing Team Page Performance (Browser Simulation)...');
    
    try {
      // First get teams list to find a team ID
      const teamsResult = await this.makeRequest(`${BASE_URL}/api/teams`);
      
      if (teamsResult.status === 200 && teamsResult.data) {
        const teams = JSON.parse(teamsResult.data).data || [];
        
        if (teams.length > 0) {
          const team = teams[0];
          console.log(`📋 Testing team: ${team.name} (${team.id})`);
          
          // Test the team page load time
          const result = await this.testPageLoadTime(`/teams/${team.id}`, 'Team Detail Page', 3000);
          
          if (result) {
            // Get team-specific data
            const teamDataResult = await this.makeRequest(`${BASE_URL}/api/teams/${team.id}`);
            
            if (teamDataResult.status === 200 && teamDataResult.data) {
              const teamData = JSON.parse(teamDataResult.data).data;
              
              const teamMetrics = {
                memberCount: teamData.members?.length || 0,
                projectCount: teamData.projects?.length || 0,
                achievementCount: teamData.achievements?.length || 0,
                hasAvatar: teamData.avatar_url ? true : false,
                hasProjects: (teamData.projects?.length || 0) > 0,
                hasAchievements: (teamData.achievements?.length || 0) > 0
              };
              
              console.log(`  📊 Team Metrics:`);
              console.log(`    Members: ${teamMetrics.memberCount}`);
              console.log(`    Projects: ${teamMetrics.projectCount}`);
              console.log(`    Achievements: ${teamMetrics.achievementCount}`);
              console.log(`    Has Avatar: ${teamMetrics.hasAvatar ? 'Yes' : 'No'}`);
              
              this.results.teamPages.push({
                ...result,
                teamId: team.id,
                teamName: team.name,
                teamMetrics
              });
            }
          }
        } else {
          console.log('⚠️ No teams found to test');
        }
      } else {
        console.log('❌ Could not fetch teams list');
      }
      
    } catch (error) {
      console.log(`❌ Team page test failed: ${error.message}`);
    }
  }

  async testNetworkPerformance() {
    console.log('\n🌐 Testing Network Performance (Browser Simulation)...');
    
    const endpoints = [
      { name: 'Home Page', url: '/' },
      { name: 'Feed Page', url: '/feed' },
      { name: 'Teams List', url: '/teams' },
      { name: 'Projects Page', url: '/projects' },
      { name: 'Events Page', url: '/events' },
      { name: 'News Page', url: '/news' }
    ];
    
    const apiEndpoints = [
      { name: 'User Profile API', url: '/api/users/me' },
      { name: 'Teams API', url: '/api/teams' },
      { name: 'Projects API', url: '/api/projects' },
      { name: 'Events API', url: '/api/events' },
      { name: 'News API', url: '/api/news' }
    ];
    
    console.log('  📊 Testing Page Endpoints:');
    for (const endpoint of endpoints) {
      try {
        const result = await this.makeRequest(`${BASE_URL}${endpoint.url}`);
        const isSlow = result.duration > 2000;
        
        this.results.networkRequests.push({
          type: 'page',
          name: endpoint.name,
          url: endpoint.url,
          duration: result.duration,
          status: result.status,
          size: result.size,
          isSlow
        });
        
        const color = isSlow ? '\x1b[31m' : '\x1b[32m';
        console.log(`    ${color}${isSlow ? 'SLOW' : 'FAST'}\x1b[0m ${endpoint.name}: ${Math.round(result.duration)}ms`);
        
      } catch (error) {
        console.log(`    ❌ ${endpoint.name}: ERROR - ${error.message}`);
      }
    }
    
    console.log('  📊 Testing API Endpoints:');
    for (const endpoint of apiEndpoints) {
      try {
        const result = await this.makeRequest(`${BASE_URL}${endpoint.url}`);
        const isSlow = result.duration > 1000;
        
        this.results.networkRequests.push({
          type: 'api',
          name: endpoint.name,
          url: endpoint.url,
          duration: result.duration,
          status: result.status,
          size: result.size,
          isSlow
        });
        
        const color = isSlow ? '\x1b[31m' : '\x1b[32m';
        console.log(`    ${color}${isSlow ? 'SLOW' : 'FAST'}\x1b[0m ${endpoint.name}: ${Math.round(result.duration)}ms`);
        
      } catch (error) {
        console.log(`    ❌ ${endpoint.name}: ERROR - ${error.message}`);
      }
    }
  }

  generateBrowserReport() {
    console.log('\n📊 BROWSER PERFORMANCE REPORT:');
    console.log('='.repeat(50));
    
    const slowPages = this.results.pages.filter(p => p.isSlow);
    const slowTeams = this.results.teamPages.filter(t => t.isSlow);
    const slowRequests = this.results.networkRequests.filter(r => r.isSlow);
    
    console.log(`\n📄 PAGE PERFORMANCE:`);
    this.results.pages.forEach(page => {
      const color = page.isSlow ? '\x1b[31m' : '\x1b[32m';
      console.log(`  ${color}${page.performance}\x1b[0m ${page.name}: ${Math.round(page.loadTime || 0)}ms`);
    });
    
    if (slowPages.length > 0) {
      console.log(`\n🐌 SLOW PAGES (${slowPages.length}):`);
      slowPages.forEach(page => {
        console.log(`  - ${page.name}: ${Math.round(page.loadTime || 0)}ms`);
        console.log(`    Status: ${page.status}`);
        console.log(`    Size: ${Math.round(page.size/1024)}KB`);
        console.log(`    Has Images: ${page.hasImages ? 'Yes' : 'No'}`);
        console.log(`    Has Scripts: ${page.hasScripts ? 'Yes' : 'No'}`);
      });
    }
    
    if (slowTeams.length > 0) {
      console.log(`\n🏢 SLOW TEAM PAGES (${slowTeams.length}):`);
      slowTeams.forEach(team => {
        console.log(`  - ${team.teamName}: ${Math.round(team.loadTime || 0)}ms`);
        console.log(`    Members: ${team.teamMetrics?.memberCount || 0}`);
        console.log(`    Projects: ${team.teamMetrics?.projectCount || 0}`);
        console.log(`    Has Avatar: ${team.teamMetrics?.hasAvatar ? 'Yes' : 'No'}`);
      });
    }
    
    if (slowRequests.length > 0) {
      console.log(`\n🌐 SLOW NETWORK REQUESTS (${slowRequests.length}):`);
      slowRequests.forEach(req => {
        console.log(`  - ${req.name}: ${Math.round(req.duration)}ms (${req.type})`);
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
    console.log('  • Use Next.js Image Optimization');
    console.log('  • Implement React.lazy for code splitting');
  }

  async run() {
    console.log('🌐 Starting Browser Performance Test...');
    console.log('🎯 Simulating real browser loading experience\n');
    
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
    this.generateBrowserReport();
  }
}

// Run the test
if (require.main === module) {
  const tester = new SimpleBrowserPerformanceTest();
  tester.run().catch(console.error);
}

module.exports = SimpleBrowserPerformanceTest;
