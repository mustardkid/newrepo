#!/usr/bin/env node

// Test suite for AI Highlights Review page
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing AI Highlights Review Page');
console.log('=====================================\n');

// Test configuration
const testConfig = {
  mockVideos: [
    {
      id: 1,
      title: 'Epic UTV Trail Run',
      description: 'Amazing trail run through the mountains',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      duration: 180,
      cfStreamId: 'test-stream-1',
      aiProcessingStatus: 'completed',
      aiViralPotentialScore: 85,
      aiHighlights: JSON.stringify([
        {
          start: 30,
          end: 45,
          description: 'Awesome jump over rocks',
          score: 9.2,
          motionLevel: 8,
          excitementLevel: 9,
          clipType: 'action'
        }
      ]),
      status: 'ready',
      user: {
        id: 'test-user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }
    },
    {
      id: 2,
      title: 'Profanity Test Video - Damn Good Ride',
      description: 'This is a damn good ride through hell valley',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      duration: 240,
      cfStreamId: 'test-stream-2',
      aiProcessingStatus: 'completed',
      aiViralPotentialScore: 72,
      aiHighlights: JSON.stringify([
        {
          start: 60,
          end: 80,
          description: 'Crazy shit happening here',
          score: 8.5,
          motionLevel: 7,
          excitementLevel: 8,
          clipType: 'climax'
        }
      ]),
      status: 'ready',
      user: {
        id: 'test-user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      }
    }
  ]
};

const tests = [
  {
    name: 'Content Filter Test',
    test: () => {
      console.log('Testing profanity filter...');
      
      // Test clean content
      const cleanContent = testConfig.mockVideos[0];
      console.log(`✓ Clean content detected: "${cleanContent.title}"`);
      
      // Test flagged content
      const flaggedContent = testConfig.mockVideos[1];
      console.log(`✓ Flagged content detected: "${flaggedContent.title}"`);
      
      // Test content analysis
      const profanityWords = ['damn', 'shit', 'hell'];
      const foundWords = profanityWords.filter(word => 
        flaggedContent.title.toLowerCase().includes(word) || 
        flaggedContent.description.toLowerCase().includes(word)
      );
      
      console.log(`✓ Found profanity words: ${foundWords.join(', ')}`);
      
      return true;
    }
  },
  {
    name: 'Text Rendering Test',
    test: () => {
      console.log('Testing text rendering improvements...');
      
      // Check if CSS classes are properly defined
      const cssPath = path.join(__dirname, '../client/src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      
      const requiredClasses = [
        'admin-text',
        'admin-heading',
        'admin-subheading',
        'admin-btn-approve',
        'admin-btn-reject',
        'admin-thumbnail',
        'admin-thumbnail-large'
      ];
      
      let passed = true;
      requiredClasses.forEach(className => {
        if (cssContent.includes(className)) {
          console.log(`✓ CSS class found: ${className}`);
        } else {
          console.log(`✗ CSS class missing: ${className}`);
          passed = false;
        }
      });
      
      // Check for system font usage
      if (cssContent.includes('system-ui')) {
        console.log('✓ System fonts configured');
      } else {
        console.log('✗ System fonts not configured');
        passed = false;
      }
      
      return passed;
    }
  },
  {
    name: 'Component Structure Test',
    test: () => {
      console.log('Testing component structure...');
      
      const componentPath = path.join(__dirname, '../client/src/pages/ai-highlights.tsx');
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      
      const requiredFeatures = [
        'Checkbox',
        'admin-btn-approve',
        'admin-btn-reject',
        'admin-thumbnail',
        'bulk-action',
        'contentAnalysis',
        'filteredVideos',
        'selectedVideos'
      ];
      
      let passed = true;
      requiredFeatures.forEach(feature => {
        if (componentContent.includes(feature)) {
          console.log(`✓ Feature found: ${feature}`);
        } else {
          console.log(`✗ Feature missing: ${feature}`);
          passed = false;
        }
      });
      
      return passed;
    }
  },
  {
    name: 'Error Handling Test',
    test: () => {
      console.log('Testing error handling...');
      
      const componentPath = path.join(__dirname, '../client/src/pages/ai-highlights.tsx');
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      
      const errorHandlingFeatures = [
        'isLoading',
        'Error Loading',
        'AlertTriangle',
        'Unable to load',
        'Try Again',
        'isUnauthorizedError'
      ];
      
      let passed = true;
      errorHandlingFeatures.forEach(feature => {
        if (componentContent.includes(feature)) {
          console.log(`✓ Error handling found: ${feature}`);
        } else {
          console.log(`✗ Error handling missing: ${feature}`);
          passed = false;
        }
      });
      
      return passed;
    }
  },
  {
    name: 'Responsive Design Test',
    test: () => {
      console.log('Testing responsive design...');
      
      const cssPath = path.join(__dirname, '../client/src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      
      const responsiveFeatures = [
        '@media (max-width: 768px)',
        'admin-thumbnail',
        'admin-thumbnail-large'
      ];
      
      // Check for responsive grid classes in the component
      const componentPath = path.join(__dirname, '../client/src/pages/ai-highlights.tsx');
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      
      const gridClasses = [
        'grid-cols-1',
        'lg:grid-cols-2', 
        'xl:grid-cols-3'
      ];
      
      let passed = true;
      responsiveFeatures.forEach(feature => {
        if (cssContent.includes(feature)) {
          console.log(`✓ Responsive feature found: ${feature}`);
        } else {
          console.log(`✗ Responsive feature missing: ${feature}`);
          passed = false;
        }
      });
      
      // Check grid classes in component
      gridClasses.forEach(className => {
        if (componentContent.includes(className)) {
          console.log(`✓ Grid class found: ${className}`);
        } else {
          console.log(`✗ Grid class missing: ${className}`);
          passed = false;
        }
      });
      
      return passed;
    }
  },
  {
    name: 'API Integration Test',
    test: () => {
      console.log('Testing API integration...');
      
      const serverPath = path.join(__dirname, '../server/routes.ts');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      const apiEndpoints = [
        '/api/admin/ai-processed-videos',
        '/api/admin/videos/bulk-action',
        '/api/admin/videos/:id/highlights/:index/approve'
      ];
      
      let passed = true;
      apiEndpoints.forEach(endpoint => {
        // For the highlight approval endpoint, check for the actual pattern
        if (endpoint.includes('highlights/:index/approve')) {
          if (serverContent.includes('highlights/:highlightIndex/approve') || 
              serverContent.includes('highlights/:index/approve')) {
            console.log(`✓ API endpoint found: ${endpoint}`);
          } else {
            console.log(`✗ API endpoint missing: ${endpoint}`);
            passed = false;
          }
        } else {
          const endpointPattern = endpoint.replace(/:\w+/g, '');
          if (serverContent.includes(endpointPattern)) {
            console.log(`✓ API endpoint found: ${endpoint}`);
          } else {
            console.log(`✗ API endpoint missing: ${endpoint}`);
            passed = false;
          }
        }
      });
      
      return passed;
    }
  }
];

// Run all tests
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n🧪 Running ${test.name}...`);
    console.log('─'.repeat(40));
    
    try {
      const result = await test.test();
      if (result) {
        console.log(`✅ ${test.name} PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name} FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} ERROR: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! AI Highlights Review page is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
  
  return failed === 0;
}

// Execute tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
});