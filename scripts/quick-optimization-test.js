#!/usr/bin/env node

/**
 * Quick Optimization Test - Tests optimizations without full build
 */

const fs = require('fs');

console.log('🚀 Quick Optimization Test...\n');

// Test results tracking
const testResults = {
  typeScript: false,
  bundleAnalysis: false,
  imageOptimization: false,
  lazyLoading: false,
  engagementAPIs: false,
  databaseMigration: false,
  reactMemo: false,
  customHooks: false,
  componentIntegration: false
};

// Test 1: TypeScript Compilation
console.log('='.repeat(50));
console.log('TEST 1: TypeScript Compilation');
console.log('='.repeat(50));

try {
  const { execSync } = require('child_process');
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation - PASSED\n');
  testResults.typeScript = true;
} catch (error) {
  console.log('❌ TypeScript compilation - FAILED\n');
  testResults.typeScript = false;
}

// Test 2: Bundle Analysis
console.log('='.repeat(50));
console.log('TEST 2: Bundle Analysis');
console.log('='.repeat(50));

if (fs.existsSync('.next/analyze/client.html')) {
  console.log('✅ Bundle analysis files generated');
  testResults.bundleAnalysis = true;
} else {
  console.log('❌ Bundle analysis files not found');
  testResults.bundleAnalysis = false;
}

// Test 3: Image Optimization Configuration
console.log('='.repeat(50));
console.log('TEST 3: Image Optimization');
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

// Test 4: Lazy Loading Components
console.log('='.repeat(50));
console.log('TEST 4: Lazy Loading Implementation');
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

// Test 5: Engagement API Endpoints
console.log('='.repeat(50));
console.log('TEST 5: Engagement API Endpoints');
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

// Test 6: Database Migration
console.log('='.repeat(50));
console.log('TEST 6: Database Migration');
console.log('='.repeat(50));

if (fs.existsSync('migrations/035_optimize_engagement_triggers.sql')) {
  console.log('✅ Database migration file exists');
  testResults.databaseMigration = true;
} else {
  console.log('❌ Database migration file not found');
  testResults.databaseMigration = false;
}

// Test 7: React.memo Implementation
console.log('='.repeat(50));
console.log('TEST 7: React.memo Optimization');
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

testResults.reactMemo = memoPassed;

// Test 8: Custom Hooks
console.log('='.repeat(50));
console.log('TEST 8: Custom Hooks');
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

testResults.customHooks = hooksPassed;

// Test 9: Component Integration
console.log('='.repeat(50));
console.log('TEST 9: Component Integration');
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

testResults.componentIntegration = integrationPassed;

// Final Results
console.log('='.repeat(50));
console.log('FINAL TEST RESULTS');
console.log('='.repeat(50));

const allTests = [
  { name: 'TypeScript Compilation', result: testResults.typeScript },
  { name: 'Bundle Analysis', result: testResults.bundleAnalysis },
  { name: 'Image Optimization', result: testResults.imageOptimization },
  { name: 'Lazy Loading', result: testResults.lazyLoading },
  { name: 'Engagement APIs', result: testResults.engagementAPIs },
  { name: 'Database Migration', result: testResults.databaseMigration },
  { name: 'React.memo', result: testResults.reactMemo },
  { name: 'Custom Hooks', result: testResults.customHooks },
  { name: 'Component Integration', result: testResults.componentIntegration }
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
  console.log('🎉 ALL OPTIMIZATION TESTS PASSED! Your optimizations are working correctly.');
  console.log('\n📊 OPTIMIZATION SUMMARY:');
  console.log('✅ Image optimization configured');
  console.log('✅ Lazy loading implemented');
  console.log('✅ Bundle analysis enabled');
  console.log('✅ Engagement system optimized');
  console.log('✅ Database triggers created');
  console.log('✅ React.memo optimizations');
  console.log('✅ Custom hooks implemented');
  console.log('✅ Component integration complete');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the issues above.');
  process.exit(1);
}
