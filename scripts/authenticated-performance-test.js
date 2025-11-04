#!/usr/bin/env node

/**
 * Authenticated Performance Test
 * Tests team pages with real authentication
 */

const { performance } = require('perf_hooks');
const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test credentials
const TEST_CREDENTIALS = {
  email: 'calebjmartin@hotmail.com',
  password: '11111111'
};

class AuthenticatedPerformanceTest {
  constructor() {
    this.authCookies = null;
    this.userId = null;
    this.results = {
      auth: null,
      teams: [],
      teamPages: [],
      summary: { total: 0, slow: 0, fast: 0 }
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.request(url, {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Authenticated-Performance-Test/1.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': this.authCookies || '',
          ...options.headers
        },
        timeout: 15000
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
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              duration,
              size: data.length,
              data: data,
              headers: res.headers
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
    console.log('🔐 Authenticating with test credentials...');
    
    try {
      const loginResult = await this.makeRequest(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: TEST_CREDENTIALS
      });

      if (loginResult.status === 200 && loginResult.data.success) {
        // Extract cookies from response
        const setCookieHeader = loginResult.headers['set-cookie'];
        if (setCookieHeader) {
          this.authCookies = Array.isArray(setCookieHeader) 
            ? setCookieHeader.join('; ') 
            : setCookieHeader;
        }

        // Get user profile to confirm auth
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

  async testTeamsList() {
    console.log('\n📋 Testing Teams List API...');
    
    try {
      const result = await this.makeRequest(`${API_BASE}/teams`);
      
      if (result.status === 200 && result.data.success) {
        const teams = result.data.data || [];
        console.log(`✅ Teams List: ${Math.round(result.duration)}ms (${Math.round(result.size/1024)}KB)`);
        console.log(`📊 Found ${teams.length} teams`);
        console.log(`📋 Teams data:`, JSON.stringify(result.data, null, 2));
        
        this.results.teams = Array.isArray(teams) ? teams.map(team => ({
          id: team.id,
          name: team.name,
          memberCount: team.currentMemberCount || 0,
          hasProjects: (team.projects?.length || 0) > 0,
          hasAchievements: (team.achievements?.length || 0) > 0
        })) : [];
        
        return Array.isArray(teams) ? teams : [];
      } else {
        console.log(`❌ Teams List failed: ${result.data?.error || 'Unknown error'}`);
        return [];
      }
      
    } catch (error) {
      console.log(`❌ Teams List error: ${error.message}`);
      return [];
    }
  }

  async testTeamPage(teamId, teamName) {
    console.log(`\n🏢 Testing Team Page: ${teamName} (${teamId})`);
    
    try {
      const result = await this.makeRequest(`${API_BASE}/teams/${teamId}`);
      
      if (result.status === 200 && result.data.success) {
        const team = result.data.data;
        const isSlow = result.duration > 2000; // 2 second threshold
        
        const analysis = {
          teamId,
          teamName,
          duration: result.duration,
          size: result.size,
          memberCount: team.members?.length || 0,
          projectCount: team.projects?.length || 0,
          achievementCount: team.achievements?.length || 0,
          isSlow,
          bottlenecks: []
        };

        // Identify bottlenecks
        if (result.duration > 2000) {
          analysis.bottlenecks.push('SLOW_API');
        }
        
        if (result.size > 200000) { // 200KB
          analysis.bottlenecks.push('LARGE_PAYLOAD');
        }
        
        if (analysis.memberCount > 10) {
          analysis.bottlenecks.push('MANY_MEMBERS');
        }

        if (analysis.projectCount > 5) {
          analysis.bottlenecks.push('MANY_PROJECTS');
        }

        // Check for base64 images
        if (team.members) {
          const hasBase64Images = team.members.some(member => 
            member.user?.avatar_url?.startsWith('data:image')
          );
          if (hasBase64Images) {
            analysis.bottlenecks.push('BASE64_IMAGES');
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

  printRecommendations() {
    console.log('\n🎯 PERFORMANCE RECOMMENDATIONS:');
    
    const slowTeams = this.results.teamPages.filter(t => t.isSlow);
    const largePayloads = this.results.teamPages.filter(t => t.size > 200000);
    const manyMembers = this.results.teamPages.filter(t => t.memberCount > 10);
    const base64Issues = this.results.teamPages.filter(t => t.bottlenecks.includes('BASE64_IMAGES'));

    if (slowTeams.length > 0) {
      console.log(`\n🐌 SLOW TEAM PAGES (${slowTeams.length}):`);
      slowTeams.forEach(team => {
        console.log(`  - ${team.teamName}: ${Math.round(team.duration)}ms`);
      });
      console.log('  💡 Solutions:');
      console.log('    • Optimize database queries with indexes');
      console.log('    • Implement API response caching');
      console.log('    • Use database connection pooling');
      console.log('    • Add pagination for large datasets');
    }

    if (largePayloads.length > 0) {
      console.log(`\n📦 LARGE PAYLOADS (${largePayloads.length}):`);
      largePayloads.forEach(team => {
        console.log(`  - ${team.teamName}: ${Math.round(team.size/1024)}KB`);
      });
      console.log('  💡 Solutions:');
      console.log('    • Implement lazy loading for projects/achievements');
      console.log('    • Compress API responses');
      console.log('    • Remove unnecessary data from responses');
      console.log('    • Use pagination for team members');
    }

    if (base64Issues.length > 0) {
      console.log(`\n🖼️ BASE64 IMAGE ISSUES (${base64Issues.length}):`);
      console.log('  💡 Solutions:');
      console.log('    • Store images in Supabase Storage');
      console.log('    • Use image optimization and resizing');
      console.log('    • Implement lazy loading for avatars');
      console.log('    • Consider WebP format for better compression');
    }

    if (manyMembers.length > 0) {
      console.log(`\n👥 MANY MEMBERS (${manyMembers.length}):`);
      console.log('  💡 Solutions:');
      console.log('    • Implement virtual scrolling');
      console.log('    • Paginate member data');
      console.log('    • Use skeleton loading states');
      console.log('    • Cache member data');
    }

    console.log('\n🚀 GENERAL OPTIMIZATIONS:');
    console.log('  • Enable Next.js Image Optimization');
    console.log('  • Use React.memo for team components');
    console.log('  • Implement React.lazy for code splitting');
    console.log('  • Add loading states and skeleton screens');
    console.log('  • Use React Query for data fetching and caching');
    console.log('  • Implement service worker caching');
  }

  printSummary() {
    console.log('\n📊 PERFORMANCE TEST SUMMARY:');
    console.log(`  Authentication: ${this.results.auth?.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`  Teams found: ${this.results.teams.length}`);
    console.log(`  Team pages tested: ${this.results.teamPages.length}`);
    console.log(`  Fast: ${this.results.summary.fast}`);
    console.log(`  Slow: ${this.results.summary.slow}`);
    
    if (this.results.summary.total > 0) {
      const slowPercentage = Math.round((this.results.summary.slow / this.results.summary.total) * 100);
      console.log(`  Slow percentage: ${slowPercentage}%`);
    }
  }

  async run() {
    console.log('🚀 Starting Authenticated Performance Test...\n');
    
    // Step 1: Authenticate
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }

    // Step 2: Get teams list
    const teams = await this.testTeamsList();
    
    // Step 3: Test individual team pages
    if (teams.length > 0) {
      console.log(`\n🏢 Testing ${teams.length} team pages...`);
      
      for (const team of teams.slice(0, 3)) { // Test first 3 teams
        await this.testTeamPage(team.id, team.name);
      }
    } else {
      console.log('\n⚠️ No teams found to test');
    }
    
    // Step 4: Print results
    this.printSummary();
    this.printRecommendations();
  }
}

// Run the test
if (require.main === module) {
  const tester = new AuthenticatedPerformanceTest();
  tester.run().catch(console.error);
}

module.exports = AuthenticatedPerformanceTest;
