#!/usr/bin/env node

/**
 * Team Performance Analyzer
 * Specifically analyzes team page performance bottlenecks
 */

const { performance } = require('perf_hooks');
const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

class TeamPerformanceAnalyzer {
  constructor() {
    this.results = [];
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const protocol = url.startsWith('https') ? https : http;
      
      const req = protocol.request(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Team-Performance-Analyzer/1.0',
          'Accept': 'application/json',
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

      req.end();
    });
  }

  async analyzeTeamPage(teamId) {
    console.log(`🔍 Analyzing team page: ${teamId}`);
    
    const startTime = performance.now();
    
    try {
      // Test team API endpoint
      const teamResult = await this.makeRequest(`${BASE_URL}/api/teams/${teamId}`);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const analysis = {
        teamId,
        totalTime,
        apiTime: teamResult.duration,
        status: teamResult.status,
        dataSize: teamResult.size,
        memberCount: teamResult.data?.members?.length || 0,
        hasProjects: teamResult.data?.projects?.length > 0,
        hasAchievements: teamResult.data?.achievements?.length > 0,
        bottlenecks: []
      };

      // Identify bottlenecks
      if (teamResult.duration > 1000) {
        analysis.bottlenecks.push('API_SLOW');
      }
      
      if (teamResult.size > 100000) { // 100KB
        analysis.bottlenecks.push('LARGE_PAYLOAD');
      }
      
      if (analysis.memberCount > 10) {
        analysis.bottlenecks.push('MANY_MEMBERS');
      }

      // Check for base64 images in member data
      if (teamResult.data?.members) {
        const hasBase64Images = teamResult.data.members.some(member => 
          member.user?.avatar_url?.startsWith('data:image')
        );
        if (hasBase64Images) {
          analysis.bottlenecks.push('BASE64_IMAGES');
        }
      }

      this.results.push(analysis);
      
      console.log(`  ✅ Team API: ${Math.round(teamResult.duration)}ms (${Math.round(teamResult.size/1024)}KB)`);
      console.log(`  📊 Members: ${analysis.memberCount}`);
      console.log(`  🚨 Bottlenecks: ${analysis.bottlenecks.join(', ') || 'None'}`);
      
      return analysis;
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      return null;
    }
  }

  async analyzeTeamsList() {
    console.log(`🔍 Analyzing teams list API`);
    
    try {
      const result = await this.makeRequest(`${BASE_URL}/api/teams`);
      
      if (result.status === 401) {
        console.log(`  ⚠️ Teams API requires authentication - this is expected`);
        console.log(`  💡 To test with auth, you'll need to provide a valid session cookie`);
        return {
          duration: result.duration,
          size: result.size,
          teamCount: 0,
          requiresAuth: true
        };
      }
      
      console.log(`  ✅ Teams List API: ${Math.round(result.duration)}ms (${Math.round(result.size/1024)}KB)`);
      console.log(`  📊 Teams count: ${result.data?.length || 0}`);
      
      return {
        duration: result.duration,
        size: result.size,
        teamCount: result.data?.length || 0,
        requiresAuth: false
      };
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      return null;
    }
  }

  printRecommendations() {
    console.log(`\n🎯 PERFORMANCE RECOMMENDATIONS:`);
    
    const slowAPIs = this.results.filter(r => r.apiTime > 1000);
    const largePayloads = this.results.filter(r => r.dataSize > 100000);
    const manyMembers = this.results.filter(r => r.memberCount > 10);
    const base64Issues = this.results.filter(r => r.bottlenecks.includes('BASE64_IMAGES'));

    if (slowAPIs.length > 0) {
      console.log(`\n🐌 SLOW APIs (${slowAPIs.length}):`);
      console.log(`  - Consider database query optimization`);
      console.log(`  - Add database indexes on frequently queried fields`);
      console.log(`  - Implement API response caching`);
      console.log(`  - Use database connection pooling`);
    }

    if (largePayloads.length > 0) {
      console.log(`\n📦 LARGE PAYLOADS (${largePayloads.length}):`);
      console.log(`  - Implement pagination for team members`);
      console.log(`  - Lazy load team projects and achievements`);
      console.log(`  - Compress API responses`);
      console.log(`  - Remove unnecessary data from API responses`);
    }

    if (base64Issues.length > 0) {
      console.log(`\n🖼️ BASE64 IMAGE ISSUES (${base64Issues.length}):`);
      console.log(`  - Store images in Supabase Storage instead of base64`);
      console.log(`  - Use image optimization and resizing`);
      console.log(`  - Implement lazy loading for member avatars`);
      console.log(`  - Consider using WebP format for better compression`);
    }

    if (manyMembers.length > 0) {
      console.log(`\n👥 MANY MEMBERS (${manyMembers.length}):`);
      console.log(`  - Implement virtual scrolling for member lists`);
      console.log(`  - Paginate member data`);
      console.log(`  - Use skeleton loading states`);
      console.log(`  - Consider member data caching`);
    }

    console.log(`\n🚀 GENERAL OPTIMIZATIONS:`);
    console.log(`  - Enable Next.js Image Optimization`);
    console.log(`  - Implement React.memo for team member components`);
    console.log(`  - Use React.lazy for code splitting`);
    console.log(`  - Add loading states and skeleton screens`);
    console.log(`  - Implement service worker caching`);
    console.log(`  - Use React Query for data fetching and caching`);
  }

  async run() {
    console.log(`🚀 Starting Team Performance Analysis...\n`);
    
    // First, get list of teams
    const teamsList = await this.analyzeTeamsList();
    
    if (teamsList && teamsList.teamCount > 0) {
      console.log(`\n📋 Found ${teamsList.teamCount} teams. Analyzing first 3...\n`);
      
      // Analyze first few teams (or you can specify team IDs)
      const teamIds = [
        '7bcbad70-6910-4479-a0f8-dc98ed11f10d', // Your current team
        // Add more team IDs here if you have them
      ];
      
      for (const teamId of teamIds) {
        await this.analyzeTeamPage(teamId);
        console.log(''); // Empty line for readability
      }
    }
    
    this.printRecommendations();
  }
}

// Run the analyzer
if (require.main === module) {
  const analyzer = new TeamPerformanceAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = TeamPerformanceAnalyzer;
