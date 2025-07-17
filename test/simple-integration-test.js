/**
 * Simple Integration Test for RideReels Platform
 * Tests core integrations and API endpoints
 */

import { expect } from 'chai';
import supertest from 'supertest';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const BASE_URL = 'http://localhost:5000';

class IntegrationTestSuite {
  constructor() {
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Running Integration Tests...\n');
    
    const tests = [
      { name: 'Health Check', test: this.testHealthCheck },
      { name: 'Environment Variables', test: this.testEnvironmentVariables },
      { name: 'Database Connection', test: this.testDatabaseConnection },
      { name: 'Authentication Endpoints', test: this.testAuthEndpoints },
      { name: 'Video Upload API', test: this.testVideoUploadAPI },
      { name: 'SendGrid Integration', test: this.testSendGridIntegration },
      { name: 'Stripe Integration', test: this.testStripeIntegration },
      { name: 'OpenAI Integration', test: this.testOpenAIIntegration },
      { name: 'Admin Dashboard', test: this.testAdminDashboard },
      { name: 'Error Handling', test: this.testErrorHandling }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        console.log(`🔍 Testing: ${test.name}`);
        const result = await test.test.call(this);
        console.log(`✅ ${test.name}: ${result}`);
        this.testResults.push({ name: test.name, status: 'PASSED', message: result });
        passed++;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.testResults.push({ name: test.name, status: 'FAILED', message: error.message });
        failed++;
      }
    }

    const total = passed + failed;
    const successRate = (passed / total) * 100;
    
    console.log('\n📊 Integration Test Results:');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    return { success: failed === 0, passed, failed, successRate };
  }

  async testHealthCheck() {
    const response = await supertest(BASE_URL)
      .get('/health')
      .expect(200);
    
    expect(response.body).to.have.property('status', 'healthy');
    return 'Health endpoint responding correctly';
  }

  async testEnvironmentVariables() {
    const required = [
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'SENDGRID_API_KEY',
      'STRIPE_SECRET_KEY',
      'VITE_STRIPE_PUBLIC_KEY'
    ];
    
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing variables: ${missing.join(', ')}`);
    }
    
    return `All ${required.length} environment variables present`;
  }

  async testDatabaseConnection() {
    const response = await supertest(BASE_URL)
      .get('/health')
      .expect(200);
    
    if (!response.body.database || response.body.database !== 'connected') {
      throw new Error('Database connection failed');
    }
    
    return 'Database connection verified';
  }

  async testAuthEndpoints() {
    // Test login endpoint
    const loginResponse = await supertest(BASE_URL)
      .get('/api/login')
      .expect(200);
    
    expect(loginResponse.text).to.include('RideReels');
    
    // Test Google OAuth redirect
    const googleResponse = await supertest(BASE_URL)
      .get('/auth/google')
      .expect(302);
    
    expect(googleResponse.headers.location).to.include('accounts.google.com');
    
    return 'Authentication endpoints working correctly';
  }

  async testVideoUploadAPI() {
    // Test video upload endpoint (without authentication for now)
    const response = await supertest(BASE_URL)
      .post('/api/videos/upload-url')
      .send({
        fileName: 'test.mp4',
        title: 'Test Video',
        description: 'Test Description'
      })
      .expect(401); // Should require authentication
    
    expect(response.body).to.have.property('message');
    return 'Video upload API properly secured';
  }

  async testSendGridIntegration() {
    // Test SendGrid configuration
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }
    
    if (!sendgridApiKey.startsWith('SG.')) {
      throw new Error('Invalid SendGrid API key format');
    }
    
    return 'SendGrid API key configured correctly';
  }

  async testStripeIntegration() {
    // Test Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublicKey = process.env.VITE_STRIPE_PUBLIC_KEY;
    
    if (!stripeSecretKey || !stripePublicKey) {
      throw new Error('Stripe keys not configured');
    }
    
    if (!stripeSecretKey.startsWith('sk_')) {
      throw new Error('Invalid Stripe secret key format');
    }
    
    if (!stripePublicKey.startsWith('pk_')) {
      throw new Error('Invalid Stripe public key format');
    }
    
    return 'Stripe API keys configured correctly';
  }

  async testOpenAIIntegration() {
    // Test OpenAI configuration
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    if (!openaiApiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }
    
    return 'OpenAI API key configured correctly';
  }

  async testAdminDashboard() {
    // Test admin endpoint availability (should require authentication)
    const response = await supertest(BASE_URL)
      .get('/api/admin/platform-stats')
      .expect(401);
    
    expect(response.body).to.have.property('message');
    return 'Admin dashboard properly secured';
  }

  async testErrorHandling() {
    // Test 404 handling
    await supertest(BASE_URL)
      .get('/api/nonexistent-endpoint')
      .expect(404);
    
    // Test invalid JSON handling
    await supertest(BASE_URL)
      .post('/api/videos/upload-url')
      .send('invalid json')
      .expect(400);
    
    return 'Error handling working correctly';
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const suite = new IntegrationTestSuite();
  suite.runTests().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { IntegrationTestSuite };