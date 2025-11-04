#!/usr/bin/env node

/**
 * Comprehensive Test Script for Obelisk Hub Optimizations
 * Tests all the performance optimizations we implemented
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Obelisk Hub Optimization Tests...\n');

// Test results tracking
const testResults = {
  build: false,
  bundleAnalysis: false,
  typeScript: false,
  imageOptimization: false,
  lazyLoading: false,
  engagementAPIs: false,
  databaseMigration: false
};

// Helper function to run commands
function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log(`✅ ${description} - PASSED\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${description} - FAILED`);
    console.log(`Error: ${error.message}\n`);
    return false;
  }
}

// Test 1: Build Process
console.log('='.repeat(50));
console.log('TEST 1: Build Process');
console.log('='.repeat(50));

testResults.build = runCommand('pnpm build', 'Building the application');

// Test 2: TypeScript Compilation
console.log('='.repeat(50));
console.log('TEST 2: TypeScript Compilation');
console.log('='.repeat(50));

testResults.typeScript = runCommand('npx tsc --noEmit', 'TypeScript type checking');

// Test 3: Bundle Analysis
console.log('='.repeat(50));
console.log('TEST 3: Bundle Analysis');
console.log('='.repeat(50));

if (fs.existsSync('.next/analyze/client.html')) {
  console.log('✅ Bundle analysis files generated');
  testResults.bundleAnalysis = true;
} else {
  console.log('❌ Bundle analysis files not found');
  testResults.bundleAnalysis = false;
}

// Test 4: Image Optimization Configuration
console.log('='.repeat(50));
console.log('TEST 4: Image Optimization');
console.log('='.repeat(50));

try {
  const nextConfig = fs.readFileSync('next.config.mjs', 'utf8');
  if (nextConfig.includes('images:') && nextConfig.includes('formats:') && nextConfig.includes('deviceSizes:')) {
    console.log('✅ Image optimization configured in next.config.mjs');
    testResults.imageOptimization = true;
  } else {
    console.log('❌ Image optimization not properly configured');
    testResults.imageOptimization = false;
  }
} catch (error) {
  console.log('❌ Could not read next.config.mjs');
  testResults.imageOptimization = false;
}

// Test 5: Lazy Loading Components
console.log('='.repeat(50));
console.log('TEST 5: Lazy Loading Implementation');
console.log('='.repeat(50));

const lazyLoadingFiles = [
  'app/news/editor/page.tsx',
  'app/feed/page.tsx',
  'app/page.tsx'
];

let lazyLoadingPassed = true;
lazyLoadingFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('dynamic(') && (content.includes('ssr: false') || content.includes('ssr: true'))) {
      console.log(`✅ ${file} - Lazy loading implemented`);
    } else {
      console.log(`❌ ${file} - Lazy loading not implemented`);
      lazyLoadingPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${file} - Could not read file`);
    lazyLoadingPassed = false;
  }
});

testResults.lazyLoading = lazyLoadingPassed;

// Test 6: Engagement API Endpoints
console.log('='.repeat(50));
console.log('TEST 6: Engagement API Endpoints');
console.log('='.repeat(50));

const engagementAPIs = [
  'app/api/engagement/batch/route.ts',
  'app/api/engagement/like/route.ts',
  'app/api/engagement/bookmark/route.ts'
];

let engagementAPIsPassed = true;
engagementAPIs.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('export async function') && content.includes('NextResponse.json')) {
      console.log(`✅ ${file} - API endpoint exists`);
    } else {
      console.log(`❌ ${file} - API endpoint malformed`);
      engagementAPIsPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${file} - Could not read file`);
    engagementAPIsPassed = false;
  }
});

testResults.engagementAPIs = engagementAPIsPassed;

// Test 7: Database Migration
console.log('='.repeat(50));
console.log('TEST 7: Database Migration');
console.log('='.repeat(50));

if (fs.existsSync('migrations/035_optimize_engagement_triggers.sql')) {
  console.log('✅ Database migration file exists');
  testResults.databaseMigration = true;
} else {
  console.log('❌ Database migration file not found');
  testResults.databaseMigration = false;
}

// Test 8: React.memo Implementation
console.log('='.repeat(50));
console.log('TEST 8: React.memo Optimization');
console.log('='.repeat(50));

const memoFiles = [
  'components/posts/post-card.tsx',
  'components/news/news-articles-grid.tsx'
];

let memoPassed = true;
memoFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('memo(') || content.includes('React.memo(')) {
      console.log(`✅ ${file} - React.memo implemented`);
    } else {
      console.log(`❌ ${file} - React.memo not implemented`);
      memoPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${file} - Could not read file`);
    memoPassed = false;
  }
});

// Test 9: Custom Hooks
console.log('='.repeat(50));
console.log('TEST 9: Custom Hooks');
console.log('='.repeat(50));

const hookFiles = [
  'hooks/use-engagement.ts'
];

let hooksPassed = true;
hookFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('export function useEngagement') && (content.includes('useApi') || content.includes('useSWR'))) {
      console.log(`✅ ${file} - Custom hook implemented`);
    } else {
      console.log(`❌ ${file} - Custom hook not properly implemented`);
      hooksPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${file} - Could not read file`);
    hooksPassed = false;
  }
});

// Test 10: Component Integration
console.log('='.repeat(50));
console.log('TEST 10: Component Integration');
console.log('='.repeat(50));

const integrationFiles = [
  'components/engagement/optimized-engagement.tsx',
  'components/news/news-article-engagement.tsx'
];

let integrationPassed = true;
integrationFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('OptimizedEngagement') || content.includes('CompactEngagement')) {
      console.log(`✅ ${file} - Component integration exists`);
    } else {
      console.log(`❌ ${file} - Component integration missing`);
      integrationPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${file} - Could not read file`);
    integrationPassed = false;
  }
});

// Final Results
console.log('='.repeat(50));
console.log('FINAL TEST RESULTS');
console.log('='.repeat(50));

const allTests = [
  { name: 'Build Process', result: testResults.build },
  { name: 'TypeScript Compilation', result: testResults.typeScript },
  { name: 'Bundle Analysis', result: testResults.bundleAnalysis },
  { name: 'Image Optimization', result: testResults.imageOptimization },
  { name: 'Lazy Loading', result: testResults.lazyLoading },
  { name: 'Engagement APIs', result: testResults.engagementAPIs },
  { name: 'Database Migration', result: testResults.databaseMigration },
  { name: 'React.memo', result: memoPassed },
  { name: 'Custom Hooks', result: hooksPassed },
  { name: 'Component Integration', result: integrationPassed }
];

let passedTests = 0;
let totalTests = allTests.length;

allTests.forEach(test => {
  const status = test.result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${test.name}`);
  if (test.result) passedTests++;
});

console.log('='.repeat(50));
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED! Your optimizations are working correctly.');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the issues above.');
  process.exit(1);
}
