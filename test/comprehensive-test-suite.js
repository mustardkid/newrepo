/**
 * RideReels Platform - Comprehensive Test Suite
 * 
 * Tests core flows: email/Google login, video upload/playback, AI processing, SendGrid emails, Stripe simulation
 */

import { expect } from 'chai';
import supertest from 'supertest';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

class ComprehensiveTestSuite {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.testResults = [];
    this.testUser = {
      email: 'test@ridereels.com',
      displayName: 'Test User',
      id: null,
      token: null
    };
    this.testVideo = {
      id: null,
      streamId: null,
      title: 'Test UTV Adventure',
      description: 'Test video for automated testing'
    };
  }

  async runAllTests() {
    console.log('\n🧪 Running Comprehensive Test Suite...\n');
    
    const tests = [
      { name: 'Database Connection', test: this.testDatabaseConnection },
      { name: 'Environment Variables', test: this.testEnvironmentVariables },
      { name: 'Simple Email Authentication', test: this.testEmailAuthentication },
      { name: 'Google OAuth Authentication', test: this.testGoogleOAuthSetup },
      { name: 'Video Upload Flow', test: this.testVideoUpload },
      { name: 'Video Status Polling', test: this.testVideoStatusPolling },
      { name: 'AI Processing Simulation', test: this.testAIProcessing },
      { name: 'SendGrid Email Integration', test: this.testSendGridEmails },
      { name: 'Stripe Payment Simulation', test: this.testStripeIntegration },
      { name: 'Admin Dashboard Access', test: this.testAdminDashboard },
      { name: 'API Error Handling', test: this.testErrorHandling }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
      try {
        console.log(`🔍 Testing: ${test.name}`);
        const result = await test.test.call(this);
        console.log(`✅ ${test.name}: ${result}`);
        this.testResults.push({
          name: test.name,
          status: 'PASSED',
          message: result,
          timestamp: new Date().toISOString()
        });
        passedTests++;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.testResults.push({
          name: test.name,
          status: 'FAILED',
          message: error.message,
          error: error.stack,
          timestamp: new Date().toISOString()
        });
        failedTests++;
      }
    }

    const successRate = (passedTests / tests.length) * 100;
    
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}/${tests.length}`);
    console.log(`❌ Failed: ${failedTests}/${tests.length}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    return {
      success: failedTests === 0,
      passedTests,
      failedTests,
      successRate,
      results: this.testResults
    };
  }

  async testDatabaseConnection() {
    const response = await supertest(this.baseUrl)
      .get('/health')
      .expect(200);
    
    if (response.body.database !== 'connected') {
      throw new Error('Database connection failed');
    }
    
    return 'Database connection verified';
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
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    return `All ${required.length} required environment variables present`;
  }

  async testEmailAuthentication() {
    // Test simple email signup
    const signupResponse = await supertest(this.baseUrl)
      .post('/api/auth/simple-signup')
      .send({
        email: this.testUser.email,
        displayName: this.testUser.displayName
      })
      .expect(200);
    
    expect(signupResponse.body).to.have.property('id');
    expect(signupResponse.body).to.have.property('email', this.testUser.email);
    
    this.testUser.id = signupResponse.body.id;
    this.testUser.token = signupResponse.body.id; // Use ID as token for simple auth
    
    // Test user retrieval
    const userResponse = await supertest(this.baseUrl)
      .get('/api/auth/user')
      .set('x-user-token', this.testUser.token)
      .expect(200);
    
    expect(userResponse.body).to.have.property('email', this.testUser.email);
    
    return 'Email authentication working correctly';
  }

  async testGoogleOAuthSetup() {
    // Test Google OAuth endpoint availability
    const response = await supertest(this.baseUrl)
      .get('/auth/google')
      .expect(302); // Should redirect to Google
    
    expect(response.headers.location).to.include('accounts.google.com');
    
    return 'Google OAuth endpoints configured correctly';
  }

  async testVideoUpload() {
    if (!this.testUser.token) {
      throw new Error('User authentication required for video upload test');
    }
    
    // Test video upload URL creation
    const uploadResponse = await supertest(this.baseUrl)
      .post('/api/videos/upload-url')
      .set('x-user-token', this.testUser.token)
      .send({
        fileName: 'test-video.mp4',
        title: this.testVideo.title,
        description: this.testVideo.description,
        category: 'utv'
      })
      .expect(200);
    
    expect(uploadResponse.body).to.have.property('video');
    expect(uploadResponse.body).to.have.property('uploadUrl');
    expect(uploadResponse.body).to.have.property('streamId');
    
    this.testVideo.id = uploadResponse.body.video.id;
    this.testVideo.streamId = uploadResponse.body.streamId;
    
    // Test video retrieval
    const videoResponse = await supertest(this.baseUrl)
      .get(`/api/videos/${this.testVideo.id}`)
      .set('x-user-token', this.testUser.token)
      .expect(200);
    
    expect(videoResponse.body).to.have.property('title', this.testVideo.title);
    
    return 'Video upload flow working correctly';
  }

  async testVideoStatusPolling() {
    if (!this.testVideo.id) {
      throw new Error('Video upload required for status polling test');
    }
    
    const statusResponse = await supertest(this.baseUrl)
      .get(`/api/videos/${this.testVideo.id}/status`)
      .set('x-user-token', this.testUser.token)
      .expect(200);
    
    expect(statusResponse.body).to.have.property('status');
    expect(statusResponse.body).to.have.property('cfProcessingStatus');
    
    return 'Video status polling working correctly';
  }

  async testAIProcessing() {
    if (!this.testVideo.id) {
      throw new Error('Video required for AI processing test');
    }
    
    // Test AI analysis endpoint (mock data)
    const analysisResponse = await supertest(this.baseUrl)
      .post(`/api/videos/${this.testVideo.id}/ai-analyze`)
      .set('x-user-token', this.testUser.token)
      .expect(200);
    
    expect(analysisResponse.body).to.have.property('highlights');
    expect(analysisResponse.body).to.have.property('contentAnalysis');
    
    // Test AI status endpoint
    const statusResponse = await supertest(this.baseUrl)
      .get(`/api/videos/${this.testVideo.id}/ai-status`)
      .set('x-user-token', this.testUser.token)
      .expect(200);
    
    expect(statusResponse.body).to.have.property('aiProcessingStatus');
    
    return 'AI processing simulation working correctly';
  }

  async testSendGridEmails() {
    if (!this.testUser.id || !this.testVideo.id) {
      throw new Error('User and video required for email test');
    }
    
    // Test notification sending
    const notificationResponse = await supertest(this.baseUrl)
      .post('/api/admin/send-test-notification')
      .set('x-user-token', this.testUser.token)
      .send({
        type: 'video_upload_received',
        userId: this.testUser.id,
        videoId: this.testVideo.id
      })
      .expect(200);
    
    expect(notificationResponse.body).to.have.property('success', true);
    
    return 'SendGrid email integration working correctly';
  }

  async testStripeIntegration() {
    // Test Stripe payment intent creation
    const paymentResponse = await supertest(this.baseUrl)
      .post('/api/create-payment-intent')
      .send({
        amount: 10.00 // $10 test amount
      })
      .expect(200);
    
    expect(paymentResponse.body).to.have.property('clientSecret');
    
    // Test subscription creation endpoint
    const subscriptionResponse = await supertest(this.baseUrl)
      .post('/api/subscriptions/create')
      .set('x-user-token', this.testUser.token)
      .send({
        priceId: 'price_test_12345'
      })
      .expect(200);
    
    expect(subscriptionResponse.body).to.have.property('clientSecret');
    
    return 'Stripe payment integration working correctly';
  }

  async testAdminDashboard() {
    // Test admin stats endpoint
    const statsResponse = await supertest(this.baseUrl)
      .get('/api/admin/platform-stats')
      .set('x-user-token', this.testUser.token)
      .expect(200);
    
    expect(statsResponse.body).to.have.property('totalVideos');
    expect(statsResponse.body).to.have.property('totalUsers');
    
    return 'Admin dashboard access working correctly';
  }

  async testErrorHandling() {
    // Test 404 handling
    await supertest(this.baseUrl)
      .get('/api/nonexistent-endpoint')
      .expect(404);
    
    // Test unauthorized access
    await supertest(this.baseUrl)
      .get('/api/videos/999')
      .expect(401);
    
    // Test invalid data handling
    await supertest(this.baseUrl)
      .post('/api/videos/upload-url')
      .set('x-user-token', this.testUser.token)
      .send({
        fileName: '', // Invalid empty filename
        title: ''
      })
      .expect(400);
    
    return 'Error handling working correctly';
  }

  generateTestReport() {
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    return {
      summary: {
        total,
        passed,
        failed,
        successRate: (passed / total) * 100
      },
      details: this.testResults,
      timestamp: new Date().toISOString()
    };
  }
}

export { ComprehensiveTestSuite };