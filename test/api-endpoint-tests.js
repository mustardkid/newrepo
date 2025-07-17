/**
 * RideReels Platform - API Endpoint Testing Suite
 * 
 * This test suite validates all API endpoints with proper authentication,
 * request/response handling, and error scenarios.
 */

import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes.js';
import { storage } from '../server/storage.js';

class APIEndpointTestSuite {
  constructor() {
    this.app = null;
    this.server = null;
    this.testUsers = [];
    this.testVideos = [];
    this.authTokens = {};
  }

  async setup() {
    console.log('🚀 Setting up API Endpoint Test Suite...');
    
    // Create Express app
    this.app = express();
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Register routes
    this.server = await registerRoutes(this.app);
    
    // Create test users
    await this.createTestUsers();
    
    // Mock authentication for testing
    this.setupAuthMocks();
    
    console.log('✅ API Endpoint Test Suite setup complete');
  }

  async createTestUsers() {
    // Create test creator
    const creator = await storage.upsertUser({
      id: 'api-test-creator-001',
      email: 'creator@apitest.com',
      firstName: 'API',
      lastName: 'Creator',
      role: 'user',
      isActive: true
    });
    this.testUsers.push(creator);

    // Create test admin
    const admin = await storage.upsertUser({
      id: 'api-test-admin-001',
      email: 'admin@apitest.com',
      firstName: 'API',
      lastName: 'Admin',
      role: 'admin',
      isActive: true
    });
    this.testUsers.push(admin);

    console.log('✅ Test users created for API tests');
  }

  setupAuthMocks() {
    // Mock authentication tokens
    this.authTokens = {
      creator: 'mock-creator-token',
      admin: 'mock-admin-token'
    };

    // Override authentication middleware for testing
    this.app.use((req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token === this.authTokens.creator) {
        req.user = { claims: { sub: this.testUsers[0].id } };
      } else if (token === this.authTokens.admin) {
        req.user = { claims: { sub: this.testUsers[1].id } };
      }
      
      next();
    });

    console.log('✅ Authentication mocks configured');
  }

  async testAuthenticationEndpoints() {
    console.log('\n🔐 Testing Authentication Endpoints...');
    
    // Test 1: Get user endpoint - authenticated
    const userResponse = await request(this.app)
      .get('/api/auth/user')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(userResponse.body.id).to.equal(this.testUsers[0].id);
    expect(userResponse.body.email).to.equal(this.testUsers[0].email);
    console.log('✅ Authenticated user endpoint works');

    // Test 2: Get user endpoint - unauthenticated
    await request(this.app)
      .get('/api/auth/user')
      .expect(401);
    console.log('✅ Unauthenticated request properly rejected');

    // Test 3: User profile endpoint
    const profileResponse = await request(this.app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(profileResponse.body.id).to.equal(this.testUsers[0].id);
    console.log('✅ User profile endpoint works');

    return { userResponse, profileResponse };
  }

  async testVideoUploadEndpoints() {
    console.log('\n🎬 Testing Video Upload Endpoints...');
    
    // Test 1: Create upload URL
    const uploadUrlResponse = await request(this.app)
      .post('/api/videos/upload-url')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .send({
        fileName: 'api-test-video.mp4',
        maxDurationSeconds: 3600
      })
      .expect(200);
    
    expect(uploadUrlResponse.body.video).to.exist;
    expect(uploadUrlResponse.body.uploadUrl).to.exist;
    expect(uploadUrlResponse.body.streamId).to.exist;
    
    const video = uploadUrlResponse.body.video;
    this.testVideos.push(video);
    console.log('✅ Upload URL creation endpoint works');

    // Test 2: Get video status
    const statusResponse = await request(this.app)
      .get(`/api/videos/${video.id}/status`)
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(statusResponse.body.id).to.equal(video.id);
    expect(statusResponse.body.status).to.exist;
    console.log('✅ Video status endpoint works');

    // Test 3: Update video metadata
    const updateResponse = await request(this.app)
      .patch(`/api/videos/${video.id}`)
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .send({
        title: 'Updated API Test Video',
        description: 'Updated description for API testing'
      })
      .expect(200);
    
    expect(updateResponse.body.title).to.equal('Updated API Test Video');
    console.log('✅ Video update endpoint works');

    // Test 4: Get user's videos
    const userVideosResponse = await request(this.app)
      .get('/api/videos/my')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(userVideosResponse.body).to.be.an('array');
    expect(userVideosResponse.body.length).to.be.greaterThan(0);
    console.log('✅ User videos endpoint works');

    // Test 5: Get detailed user videos
    const detailedVideosResponse = await request(this.app)
      .get('/api/videos/my-detailed')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(detailedVideosResponse.body).to.be.an('array');
    console.log('✅ Detailed user videos endpoint works');

    return { video, uploadUrlResponse, statusResponse, updateResponse };
  }

  async testNotificationEndpoints() {
    console.log('\n📢 Testing Notification Endpoints...');
    
    const creator = this.testUsers[0];
    
    // Create test notification
    const notification = await storage.createNotification({
      userId: creator.id,
      type: 'api_test',
      title: 'API Test Notification',
      message: 'This is a test notification for API testing',
      data: JSON.stringify({ testData: 'api-test' })
    });

    // Test 1: Get user notifications
    const notificationsResponse = await request(this.app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(notificationsResponse.body).to.be.an('array');
    const testNotification = notificationsResponse.body.find(n => n.id === notification.id);
    expect(testNotification).to.exist;
    expect(testNotification.isRead).to.be.false;
    console.log('✅ Get notifications endpoint works');

    // Test 2: Mark notification as read
    await request(this.app)
      .post(`/api/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    // Verify notification is marked as read
    const updatedNotificationsResponse = await request(this.app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    const updatedNotification = updatedNotificationsResponse.body.find(n => n.id === notification.id);
    expect(updatedNotification.isRead).to.be.true;
    console.log('✅ Mark notification as read endpoint works');

    return { notification, notificationsResponse };
  }

  async testEarningsEndpoints() {
    console.log('\n💰 Testing Earnings Endpoints...');
    
    // Test 1: Get earnings projection
    const projectionResponse = await request(this.app)
      .get('/api/earnings/projection')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(projectionResponse.body.totalVideos).to.be.a('number');
    expect(projectionResponse.body.publishedVideos).to.be.a('number');
    expect(projectionResponse.body.totalEarnings).to.be.a('string');
    console.log('✅ Earnings projection endpoint works');

    // Test 2: Get user payouts
    const payoutsResponse = await request(this.app)
      .get('/api/payouts/my')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(payoutsResponse.body).to.be.an('array');
    console.log('✅ User payouts endpoint works');

    return { projectionResponse, payoutsResponse };
  }

  async testProfileEndpoints() {
    console.log('\n👤 Testing Profile Endpoints...');
    
    // Test 1: Update user profile
    const profileData = {
      biography: 'Updated API test biography',
      equipment: JSON.stringify([
        { type: 'utv', brand: 'Polaris', model: 'RZR Pro XP' }
      ]),
      ridingStyle: 'rock_crawling',
      experienceLevel: 'expert',
      location: 'Utah, USA'
    };

    const updateResponse = await request(this.app)
      .post('/api/profile/update')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .send(profileData)
      .expect(200);
    
    expect(updateResponse.body.message).to.equal('Profile updated successfully');
    console.log('✅ Profile update endpoint works');

    // Test 2: Verify profile was updated
    const profileResponse = await request(this.app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(profileResponse.body.biography).to.equal(profileData.biography);
    expect(profileResponse.body.ridingStyle).to.equal(profileData.ridingStyle);
    console.log('✅ Profile update verification works');

    return { updateResponse, profileResponse };
  }

  async testAdminEndpoints() {
    console.log('\n👨‍💼 Testing Admin Endpoints...');
    
    // Test 1: Get platform statistics
    const statsResponse = await request(this.app)
      .get('/api/admin/platform-stats')
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .expect(200);
    
    expect(statsResponse.body.totalUsers).to.be.a('number');
    expect(statsResponse.body.totalVideos).to.be.a('number');
    expect(statsResponse.body.totalRevenue).to.be.a('string');
    console.log('✅ Platform statistics endpoint works');

    // Test 2: Get all users
    const usersResponse = await request(this.app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .expect(200);
    
    expect(usersResponse.body).to.be.an('array');
    expect(usersResponse.body.length).to.be.greaterThan(0);
    console.log('✅ Admin users endpoint works');

    // Test 3: Get all videos
    const videosResponse = await request(this.app)
      .get('/api/admin/videos')
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .expect(200);
    
    expect(videosResponse.body).to.be.an('array');
    console.log('✅ Admin videos endpoint works');

    // Test 4: Update user role
    const creator = this.testUsers[0];
    const roleUpdateResponse = await request(this.app)
      .patch(`/api/admin/users/${creator.id}/role`)
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .send({ role: 'moderator' })
      .expect(200);
    
    expect(roleUpdateResponse.body.role).to.equal('moderator');
    console.log('✅ User role update endpoint works');

    // Test 5: Update user status
    const statusUpdateResponse = await request(this.app)
      .patch(`/api/admin/users/${creator.id}/status`)
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .send({ isActive: false })
      .expect(200);
    
    expect(statusUpdateResponse.body.isActive).to.be.false;
    console.log('✅ User status update endpoint works');

    // Test 6: Get admin payouts
    const adminPayoutsResponse = await request(this.app)
      .get('/api/admin/payouts')
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .expect(200);
    
    expect(adminPayoutsResponse.body).to.be.an('array');
    console.log('✅ Admin payouts endpoint works');

    // Test 7: Test non-admin access (should fail)
    await request(this.app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(403);
    console.log('✅ Non-admin access properly blocked');

    return { statsResponse, usersResponse, videosResponse };
  }

  async testVideoStatusEndpoints() {
    console.log('\n🎥 Testing Video Status Endpoints...');
    
    const video = this.testVideos[0];
    
    // Test 1: Update video status (admin only)
    const statusUpdateResponse = await request(this.app)
      .patch(`/api/admin/videos/${video.id}/status`)
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .send({ status: 'published' })
      .expect(200);
    
    expect(statusUpdateResponse.body.status).to.equal('published');
    console.log('✅ Video status update endpoint works');

    // Test 2: Get AI processed videos
    const aiVideosResponse = await request(this.app)
      .get('/api/admin/ai-processed-videos')
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .expect(200);
    
    expect(aiVideosResponse.body).to.be.an('array');
    console.log('✅ AI processed videos endpoint works');

    // Test 3: Trigger AI analysis
    const aiAnalysisResponse = await request(this.app)
      .post(`/api/videos/${video.id}/ai-analyze`)
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(200);
    
    expect(aiAnalysisResponse.body.highlights).to.be.an('array');
    console.log('✅ AI analysis trigger endpoint works');

    return { statusUpdateResponse, aiVideosResponse, aiAnalysisResponse };
  }

  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');
    
    // Test 1: Non-existent video
    await request(this.app)
      .get('/api/videos/99999/status')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(404);
    console.log('✅ Non-existent video error handled');

    // Test 2: Invalid video update
    await request(this.app)
      .patch('/api/videos/99999')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .send({ title: 'Invalid Update' })
      .expect(404);
    console.log('✅ Invalid video update error handled');

    // Test 3: Invalid user role update
    await request(this.app)
      .patch('/api/admin/users/invalid-user/role')
      .set('Authorization', `Bearer ${this.authTokens.admin}`)
      .send({ role: 'invalid-role' })
      .expect(400);
    console.log('✅ Invalid role update error handled');

    // Test 4: Unauthorized access
    await request(this.app)
      .get('/api/admin/users')
      .expect(401);
    console.log('✅ Unauthorized access error handled');

    // Test 5: Invalid notification ID
    await request(this.app)
      .post('/api/notifications/99999/read')
      .set('Authorization', `Bearer ${this.authTokens.creator}`)
      .expect(404);
    console.log('✅ Invalid notification error handled');

    return { success: true };
  }

  async testWebhookEndpoints() {
    console.log('\n🔗 Testing Webhook Endpoints...');
    
    const video = this.testVideos[0];
    
    // Test 1: Cloudflare webhook
    const webhookPayload = {
      uid: video.cfStreamId,
      status: 'ready',
      meta: {
        duration: 300,
        name: video.fileName
      }
    };

    const webhookResponse = await request(this.app)
      .post('/api/webhooks/cloudflare')
      .send(webhookPayload)
      .expect(200);
    
    expect(webhookResponse.body.message).to.equal('Webhook processed successfully');
    console.log('✅ Cloudflare webhook endpoint works');

    // Test 2: Webhook with invalid video
    const invalidWebhookPayload = {
      uid: 'invalid-stream-id',
      status: 'ready',
      meta: { duration: 300 }
    };

    await request(this.app)
      .post('/api/webhooks/cloudflare')
      .send(invalidWebhookPayload)
      .expect(404);
    console.log('✅ Invalid webhook payload error handled');

    return { webhookResponse };
  }

  async runAllTests() {
    console.log('\n🧪 Running Complete API Endpoint Test Suite...\n');
    
    try {
      await this.setup();
      
      // Run all test phases
      await this.testAuthenticationEndpoints();
      await this.testVideoUploadEndpoints();
      await this.testNotificationEndpoints();
      await this.testEarningsEndpoints();
      await this.testProfileEndpoints();
      await this.testAdminEndpoints();
      await this.testVideoStatusEndpoints();
      await this.testErrorHandling();
      await this.testWebhookEndpoints();
      
      console.log('\n🎉 All API Endpoint Tests Passed Successfully!');
      console.log('\n📊 API Test Summary:');
      console.log(`- Users tested: ${this.testUsers.length}`);
      console.log(`- Videos tested: ${this.testVideos.length}`);
      console.log(`- Endpoints tested: 25+`);
      console.log(`- Error scenarios tested: 5+`);
      
      return {
        success: true,
        message: 'All API endpoint tests completed successfully',
        stats: {
          users: this.testUsers.length,
          videos: this.testVideos.length,
          endpointsTested: 25,
          errorScenarios: 5
        }
      };
      
    } catch (error) {
      console.error('\n❌ API Test Failed:', error);
      return {
        success: false,
        message: `API test failed: ${error.message}`,
        error: error.stack
      };
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up API test data...');
    
    try {
      // Clean up test videos
      for (const video of this.testVideos) {
        await storage.deleteVideo(video.id);
      }
      
      // Clean up test users
      for (const user of this.testUsers) {
        await db.delete(users).where(eq(users.id, user.id));
      }
      
      // Close server
      if (this.server) {
        this.server.close();
      }
      
      console.log('✅ API test cleanup completed');
      
    } catch (error) {
      console.error('❌ API test cleanup failed:', error);
    }
  }
}

export { APIEndpointTestSuite };

// If run directly, execute all tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new APIEndpointTestSuite();
  testSuite.runAllTests()
    .then(result => {
      console.log('\n' + '='.repeat(60));
      console.log('API ENDPOINT TEST SUITE RESULTS');
      console.log('='.repeat(60));
      console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Message: ${result.message}`);
      if (result.stats) {
        console.log('Statistics:', result.stats);
      }
      console.log('='.repeat(60));
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ API test suite execution failed:', error);
      process.exit(1);
    });
}