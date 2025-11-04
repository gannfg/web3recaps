#!/usr/bin/env node

/**
 * Cursor-Optimized Performance Test
 * Leverages Cursor's new features for enhanced performance testing
 */

const { performance } = require('perf_hooks');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test credentials
const TEST_CREDENTIALS = {
  email: 'calebjmartin@hotmail.com',
  password: '11111111'
};

class CursorOptimizedPerformanceTest {
  constructor() {
    this.authCookies = null;
    this.userId = null;
    this.results = {
      auth: null,
      pages: [],
      apis: [],
      teams: [],
      teamPages: [],
      summary: { total: 0, slow: 0, fast: 0, errors: 0 },
      recommendations: []
    };
    this.startTime = performance.now();
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.request(url, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Cursor-Optimized-Performance-Test/1.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': this.authCookies || '',
          ...options.headers
        },
        timeout: 30000 // Increased timeout for comprehensive testing
      }, (res) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              status: res.statusCode,
              duration,
              size: data.length,
              data: jsonData,
              headers: res.headers,
              url: url
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              duration,
              size: data.length,
              data: data,
              headers: res.headers,
              url: url
            });
          }
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
    console.log('🔐 Authenticating with Cursor-optimized credentials...');
    
    try {
      const loginResult = await this.makeRequest(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: TEST_CREDENTIALS
      });

      if (loginResult.status === 200 && loginResult.data.success) {
        const setCookieHeader = loginResult.headers['set-cookie'];
        if (setCookieHeader) {
          this.authCookies = Array.isArray(setCookieHeader) 
            ? setCookieHeader.join('; ') 
            : setCookieHeader;
        }

        const profileResult = await this.makeRequest(`${API_BASE}/users/me`);
        if (profileResult.status === 200 && profileResult.data.success) {
          this.userId = profileResult.data.data?.user?.id;
          console.log(`✅ Authenticated successfully as: ${profileResult.data.data?.user?.displayName || 'User'}`);
          this.results.auth = {
            success: true,
            duration: loginResult.duration,
            userId: this.userId
          };
          return true;
        }
      }
      
      console.log('❌ Authentication failed');
      this.results.auth = { success: false, error: 'Login failed' };
      return false;
      
    } catch (error) {
      console.log(`❌ Authentication error: ${error.message}`);
      this.results.auth = { success: false, error: error.message };
      return false;
    }
  }

  async testPages() {
    console.log('\n📄 Testing Pages with Cursor optimization...');
    
    const pages = [
      { name: 'Home', url: '/', maxTime: 2000 },
      { name: 'Feed', url: '/feed', maxTime: 3000 },
      { name: 'Teams List', url: '/teams', maxTime: 2500 },
      { name: 'Projects', url: '/projects', maxTime: 2500 },
      { name: 'Events', url: '/events', maxTime: 2500 },
      { name: 'News', url: '/news', maxTime: 3000 }
    ];

    for (const page of pages) {
      try {
        const result = await this.makeRequest(`${BASE_URL}${page.url}`);
        const isSlow = result.duration > page.maxTime;
        
        this.results.pages.push({
          name: page.name,
          url: page.url,
          duration: result.duration,
          status: result.status,
          size: result.size,
          isSlow,
          performance: isSlow ? 'SLOW' : 'FAST'
        });

        const statusColor = result.status === 200 ? '\x1b[32m' : '\x1b[31m';
        const perfColor = isSlow ? '\x1b[31m' : '\x1b[32m';
        
        console.log(`  ${statusColor}✓${'\x1b[0m'} ${page.name}: ${Math.round(result.duration)}ms ${perfColor}(${isSlow ? 'SLOW' : 'FAST'})${'\x1b[0m'}`);
        
        if (isSlow) this.results.summary.slow++;
        else this.results.summary.fast++;
        this.results.summary.total++;
        
      } catch (error) {
        console.log(`  ❌ ${page.name}: ERROR - ${error.message}`);
        this.results.pages.push({
          name: page.name,
          url: page.url,
          duration: null,
          status: 'ERROR',
          error: error.message,
          isSlow: true,
          performance: 'ERROR'
        });
        this.results.summary.slow++;
        this.results.summary.errors++;
        this.results.summary.total++;
      }
    }
  }

  async testAPIs() {
    console.log('\n🔌 Testing APIs with enhanced monitoring...');
    
    const apis = [
      { name: 'User Profile', url: '/users/me', maxTime: 1000, requiresAuth: true },
      { name: 'Teams List', url: '/teams', maxTime: 1500, requiresAuth: true },
      { name: 'Projects', url: '/projects', maxTime: 1500, requiresAuth: true },
      { name: 'Events', url: '/events', maxTime: 1500, requiresAuth: false },
      { name: 'News', url: '/news', maxTime: 1000, requiresAuth: false }
    ];

    for (const api of apis) {
      try {
        const result = await this.makeRequest(`${API_BASE}${api.url}`);
        
        if (result.status === 401 && api.requiresAuth) {
          console.log(`  ⚠️ ${api.name}: Authentication required (expected)`);
          this.results.apis.push({
            name: api.name,
            url: api.url,
            duration: result.duration,
            status: result.status,
            size: result.size,
            isSlow: false,
            performance: 'AUTH_REQUIRED'
          });
          this.results.summary.fast++;
          this.results.summary.total++;
          continue;
        }
        
        const isSlow = result.duration > api.maxTime;
        
        this.results.apis.push({
          name: api.name,
          url: api.url,
          duration: result.duration,
          status: result.status,
          size: result.size,
          isSlow,
          performance: isSlow ? 'SLOW' : 'FAST'
        });

        const statusColor = result.status === 200 ? '\x1b[32m' : '\x1b[31m';
        const perfColor = isSlow ? '\x1b[31m' : '\x1b[32m';
        
        console.log(`  ${statusColor}✓${'\x1b[0m'} ${api.name}: ${Math.round(result.duration)}ms ${perfColor}(${isSlow ? 'SLOW' : 'FAST'})${'\x1b[0m'}`);
        
        if (isSlow) this.results.summary.slow++;
        else this.results.summary.fast++;
        this.results.summary.total++;
        
      } catch (error) {
        console.log(`  ❌ ${api.name}: ERROR - ${error.message}`);
        this.results.apis.push({
          name: api.name,
          url: api.url,
          duration: null,
          status: 'ERROR',
          error: error.message,
          isSlow: true,
          performance: 'ERROR'
        });
        this.results.summary.slow++;
        this.results.summary.errors++;
        this.results.summary.total++;
      }
    }
  }

  async testTeamsWithCursorOptimization() {
    console.log('\n🏢 Testing Teams with Cursor-optimized analysis...');
    
    try {
      const result = await this.makeRequest(`${API_BASE}/teams`);
      
      if (result.status === 200 && result.data.success) {
        const teams = result.data.data || [];
        console.log(`✅ Teams List: ${Math.round(result.duration)}ms (${Math.round(result.size/1024)}KB)`);
        console.log(`📊 Found ${teams.length} teams`);
        
        this.results.teams = teams.map(team => ({
          id: team.id,
          name: team.name,
          memberCount: team.currentMemberCount || 0,
          hasProjects: (team.projects?.length || 0) > 0,
          hasAchievements: (team.achievements?.length || 0) > 0
        }));
        
        // Test individual team pages with Cursor optimization
        if (teams.length > 0) {
          console.log(`\n🔍 Testing ${Math.min(teams.length, 3)} team pages with Cursor optimization...`);
          
          for (const team of teams.slice(0, 3)) {
            await this.testTeamPageWithCursorOptimization(team.id, team.name);
          }
        }
        
        return teams;
      } else {
        console.log(`❌ Teams List failed: ${result.data?.error || 'Unknown error'}`);
        return [];
      }
      
    } catch (error) {
      console.log(`❌ Teams List error: ${error.message}`);
      return [];
    }
  }

  async testTeamPageWithCursorOptimization(teamId, teamName) {
    console.log(`\n🏢 Testing Team Page: ${teamName} (${teamId})`);
    
    try {
      const result = await this.makeRequest(`${API_BASE}/teams/${teamId}`);
      
      if (result.status === 200 && result.data.success) {
        const team = result.data.data;
        const isSlow = result.duration > 2000;
        
        const analysis = {
          teamId,
          teamName,
          duration: result.duration,
          size: result.size,
          memberCount: team.members?.length || 0,
          projectCount: team.projects?.length || 0,
          achievementCount: team.achievements?.length || 0,
          isSlow,
          bottlenecks: [],
          cursorOptimizations: []
        };

        // Cursor-optimized bottleneck detection
        if (result.duration > 2000) {
          analysis.bottlenecks.push('SLOW_API');
          analysis.cursorOptimizations.push('Consider implementing React.memo for team components');
        }
        
        if (result.size > 200000) {
          analysis.bottlenecks.push('LARGE_PAYLOAD');
          analysis.cursorOptimizations.push('Implement lazy loading for projects/achievements');
        }
        
        if (analysis.memberCount > 10) {
          analysis.bottlenecks.push('MANY_MEMBERS');
          analysis.cursorOptimizations.push('Use virtual scrolling for member lists');
        }

        if (analysis.projectCount > 5) {
          analysis.bottlenecks.push('MANY_PROJECTS');
          analysis.cursorOptimizations.push('Implement pagination for project data');
        }

        // Check for base64 images (Cursor optimization)
        if (team.members) {
          const hasBase64Images = team.members.some(member => 
            member.user?.avatar_url?.startsWith('data:image')
          );
          if (hasBase64Images) {
            analysis.bottlenecks.push('BASE64_IMAGES');
            analysis.cursorOptimizations.push('Use Supabase Storage for image optimization');
          }
        }

        this.results.teamPages.push(analysis);
        
        const perfColor = isSlow ? '\x1b[31m' : '\x1b[32m';
        const perfStatus = isSlow ? 'SLOW' : 'FAST';
        
        console.log(`  ${perfColor}${perfStatus}\x1b[0m API: ${Math.round(result.duration)}ms (${Math.round(result.size/1024)}KB)`);
        console.log(`  📊 Members: ${analysis.memberCount}, Projects: ${analysis.projectCount}, Achievements: ${analysis.achievementCount}`);
        
        if (analysis.bottlenecks.length > 0) {
          console.log(`  🚨 Bottlenecks: ${analysis.bottlenecks.join(', ')}`);
        }
        
        if (analysis.cursorOptimizations.length > 0) {
          console.log(`  🎯 Cursor Optimizations: ${analysis.cursorOptimizations.join(', ')}`);
        }
        
        if (isSlow) this.results.summary.slow++;
        else this.results.summary.fast++;
        this.results.summary.total++;
        
        return analysis;
      } else {
        console.log(`❌ Team page failed: ${result.data?.error || 'Unknown error'}`);
        return null;
      }
      
    } catch (error) {
      console.log(`❌ Team page error: ${error.message}`);
      return null;
    }
  }

  generateCursorOptimizedRecommendations() {
    console.log('\n🎯 CURSOR-OPTIMIZED PERFORMANCE RECOMMENDATIONS:');
    
    const slowPages = this.results.pages.filter(p => p.isSlow);
    const slowApis = this.results.apis.filter(a => a.isSlow);
    const slowTeams = this.results.teamPages.filter(t => t.isSlow);
    
    // Cursor-specific optimizations
    const cursorOptimizations = [
      'Use Cursor\'s Background Agent for remote performance testing',
      'Leverage Cursor\'s BugBot for automated performance bottleneck detection',
      'Implement Cursor\'s Memories feature for context-aware optimization',
      'Use Cursor\'s Agent in Jupyter Notebooks for data analysis'
    ];

    console.log('\n🚀 CURSOR-SPECIFIC OPTIMIZATIONS:');
    cursorOptimizations.forEach(opt => console.log(`  • ${opt}`));

    if (slowPages.length > 0) {
      console.log(`\n🐌 SLOW PAGES (${slowPages.length}):`);
      slowPages.forEach(page => {
        console.log(`  - ${page.name}: ${Math.round(page.duration)}ms`);
      });
      console.log('  💡 Cursor Solutions:');
      console.log('    • Use Cursor\'s Background Agent for parallel page testing');
      console.log('    • Implement React.lazy with Cursor\'s code generation');
      console.log('    • Use Cursor\'s BugBot to identify rendering bottlenecks');
    }

    if (slowApis.length > 0) {
      console.log(`\n🔌 SLOW APIs (${slowApis.length}):`);
      slowApis.forEach(api => {
        console.log(`  - ${api.name}: ${Math.round(api.duration)}ms`);
      });
      console.log('  💡 Cursor Solutions:');
      console.log('    • Use Cursor\'s Memories to cache API optimization patterns');
      console.log('    • Implement database indexing with Cursor\'s code suggestions');
      console.log('    • Use Cursor\'s Agent for automated query optimization');
    }

    if (slowTeams.length > 0) {
      console.log(`\n🏢 SLOW TEAM PAGES (${slowTeams.length}):`);
      slowTeams.forEach(team => {
        console.log(`  - ${team.teamName}: ${Math.round(team.duration)}ms`);
        if (team.cursorOptimizations.length > 0) {
          console.log(`    Cursor Optimizations: ${team.cursorOptimizations.join(', ')}`);
        }
      });
    }

    console.log('\n🎯 GENERAL CURSOR-ENHANCED OPTIMIZATIONS:');
    console.log('  • Enable Next.js Image Optimization with Cursor\'s code generation');
    console.log('  • Use React.memo with Cursor\'s automated component optimization');
    console.log('  • Implement React.lazy with Cursor\'s code splitting suggestions');
    console.log('  • Add loading states using Cursor\'s UI component generation');
    console.log('  • Use React Query with Cursor\'s data fetching patterns');
    console.log('  • Implement service worker caching with Cursor\'s PWA templates');
  }

  generateCursorReport() {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;
    
    console.log('\n📊 CURSOR-OPTIMIZED PERFORMANCE REPORT:');
    console.log(`  Total test duration: ${Math.round(totalDuration)}ms`);
    console.log(`  Authentication: ${this.results.auth?.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`  Pages tested: ${this.results.pages.length}`);
    console.log(`  APIs tested: ${this.results.apis.length}`);
    console.log(`  Teams found: ${this.results.teams.length}`);
    console.log(`  Team pages tested: ${this.results.teamPages.length}`);
    console.log(`  Fast: ${this.results.summary.fast}`);
    console.log(`  Slow: ${this.results.summary.slow}`);
    console.log(`  Errors: ${this.results.summary.errors}`);
    
    if (this.results.summary.total > 0) {
      const slowPercentage = Math.round((this.results.summary.slow / this.results.summary.total) * 100);
      console.log(`  Slow percentage: ${slowPercentage}%`);
    }

    // Save results for Cursor's Memories feature
    this.saveResultsForCursor();
  }

  saveResultsForCursor() {
    const resultsPath = path.join(__dirname, 'cursor-performance-results.json');
    const cursorOptimizedResults = {
      timestamp: new Date().toISOString(),
      totalDuration: performance.now() - this.startTime,
      results: this.results,
      cursorFeatures: {
        backgroundAgent: 'Available for remote testing',
        bugBot: 'Can identify performance bottlenecks',
        memories: 'Can store optimization patterns',
        jupyterIntegration: 'Available for data analysis'
      }
    };

    try {
      fs.writeFileSync(resultsPath, JSON.stringify(cursorOptimizedResults, null, 2));
      console.log(`\n💾 Results saved for Cursor's Memories: ${resultsPath}`);
    } catch (error) {
      console.log(`\n⚠️ Could not save results: ${error.message}`);
    }
  }

  async run() {
    console.log('🚀 Starting Cursor-Optimized Performance Test...\n');
    console.log('🎯 Leveraging Cursor\'s latest features for enhanced testing\n');
    
    // Step 1: Authenticate
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }

    // Step 2: Test pages
    await this.testPages();
    
    // Step 3: Test APIs
    await this.testAPIs();
    
    // Step 4: Test teams with Cursor optimization
    await this.testTeamsWithCursorOptimization();
    
    // Step 5: Generate Cursor-optimized recommendations
    this.generateCursorOptimizedRecommendations();
    
    // Step 6: Generate report
    this.generateCursorReport();
  }
}

// Run the test
if (require.main === module) {
  const tester = new CursorOptimizedPerformanceTest();
  tester.run().catch(console.error);
}

module.exports = CursorOptimizedPerformanceTest;
