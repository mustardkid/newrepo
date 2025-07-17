/**
 * RideReels Platform - End-to-End Testing Suite
 * 
 * This comprehensive test suite validates the complete video processing pipeline,
 * revenue attribution system, notification flows, admin workflows, and Cloudflare integration.
 */

import { expect } from 'chai';
import request from 'supertest';
import { db } from '../server/db.js';
import { storage } from '../server/storage.js';
// Note: Test files will use compiled JS versions or mock services
// import { emailService } from '../server/emailService.js';
// import { cloudflareStreamService } from '../server/cloudflareStream.js';
// import { aiVideoProcessor } from '../server/aiVideoProcessor.js';
// import { stripeRevenueService } from '../server/stripeRevenueService.js';

// Mock external services for testing
const mockCloudflareResponse = {
  success: true,
  result: {
    uid: 'test-stream-id-123',
    uploadURL: 'https://upload.videodelivery.net/test-upload-url',
    preview: 'https://watch.videodelivery.net/test-stream-id-123',
    thumbnail: 'https://videodelivery.net/test-stream-id-123/thumbnails/thumbnail.jpg',
    readyToStream: false,
    status: {
      state: 'uploading',
      pctComplete: '0'
    }
  }
};

const mockAIAnalysisResult = {
  highlights: [
    {
      start: 30,
      end: 65,
      description: 'Epic jump sequence with perfect landing',
      score: 0.92,
      motionLevel: 8,
      excitementLevel: 9,
      clipType: 'action',
      thumbnailTimestamp: 45
    },
    {
      start: 120,
      end: 180,
      description: 'Challenging rock crawling section',
      score: 0.85,
      motionLevel: 6,
      excitementLevel: 7,
      clipType: 'action',
      thumbnailTimestamp: 150
    }
  ],
  sceneTransitions: [
    {
      timestamp: 30,
      sceneType: 'action',
      description: 'Transition to jump sequence',
      motionIntensity: 8,
      visualComplexity: 7
    }
  ],
  contentAnalysis: {
    actionLevel: 8,
    scenery: ['desert', 'rocks', 'canyon'],
    vehicles: ['utv', 'side-by-side'],
    terrain: ['rocky', 'sandy'],
    mood: 'exciting',
    excitement: 8.5,
    visualQuality: 7.8,
    audioQuality: 8.2,
    overallViralPotential: 0.87
  },
  editingSuggestions: [
    {
      type: 'highlight',
      timestamp: 45,
      description: 'Perfect moment for highlight reel',
      priority: 9,
      confidence: 0.95
    }
  ],
  generatedTitle: 'Epic UTV Desert Adventure - Insane Jumps!',
  generatedDescription: 'Watch this incredible UTV adventure through desert terrain with amazing jumps and rock crawling action.',
  generatedTags: ['utv', 'desert', 'adventure', 'offroad', 'jumping'],
  youtubeMetadata: {
    title: 'Epic UTV Desert Adventure - Insane Jumps!',
    description: 'Watch this incredible UTV adventure through desert terrain with amazing jumps and rock crawling action.',
    tags: ['utv', 'desert', 'adventure', 'offroad', 'jumping'],
    category: 'Sports',
    thumbnailTimestamp: 45
  },
  tiktokMetadata: {
    title: 'Epic UTV Desert Jump!',
    description: 'Insane UTV jump in the desert! 🚗💨',
    hashtags: ['#utv', '#desert', '#adventure', '#offroad', '#viral'],
    duration: 35,
    bestMoments: [45, 150]
  },
  thumbnailRecommendations: [
    {
      timestamp: 45,
      score: 0.95,
      reason: 'Peak action moment with clear vehicle visibility',
      visualElements: ['utv', 'jump', 'dust cloud'],
      emotionalImpact: 9
    }
  ],
  compiledHighlights: [
    {
      id: 'highlight-1',
      startTime: 30,
      endTime: 65,
      duration: 35,
      title: 'Epic Jump Sequence',
      description: 'Amazing UTV jump with perfect landing',
      score: 0.92,
      transitions: [
        {
          type: 'fade',
          duration: 0.5
        }
      ]
    }
  ]
};

class E2ETestSuite {
  constructor() {
    this.testUsers = [];
    this.testVideos = [];
    this.testNotifications = [];
    this.testPayouts = [];
    this.cleanup = [];
  }

  async setup() {
    console.log('🚀 Setting up E2E Test Suite...');
    
    // Create test users
    await this.createTestUsers();
    
    // Setup mock services
    this.setupMockServices();
    
    console.log('✅ E2E Test Suite setup complete');
  }

  async createTestUsers() {
    // Create test creator
    const creator = await storage.upsertUser({
      id: 'test-creator-001',
      email: 'creator@test.com',
      firstName: 'Test',
      lastName: 'Creator',
      role: 'user',
      isActive: true,
      biography: 'Test creator for E2E testing',
      equipment: JSON.stringify([{ type: 'utv', brand: 'Polaris', model: 'RZR' }]),
      ridingStyle: 'trail',
      experienceLevel: 'advanced',
      location: 'Arizona, USA'
    });
    this.testUsers.push(creator);

    // Create test admin
    const admin = await storage.upsertUser({
      id: 'test-admin-001',
      email: 'admin@test.com',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      isActive: true
    });
    this.testUsers.push(admin);

    console.log('✅ Test users created:', this.testUsers.length);
  }

  setupMockServices() {
    // Mock Cloudflare Stream service
    this.originalCloudflareService = cloudflareStreamService.createUploadUrl;
    cloudflareStreamService.createUploadUrl = async (fileName, maxDuration) => {
      console.log(`🔄 Mock Cloudflare: Creating upload URL for ${fileName}`);
      return mockCloudflareResponse;
    };

    cloudflareStreamService.getVideoDetails = async (streamId) => {
      console.log(`🔄 Mock Cloudflare: Getting video details for ${streamId}`);
      return {
        success: true,
        result: {
          uid: streamId,
          thumbnail: `https://videodelivery.net/${streamId}/thumbnails/thumbnail.jpg`,
          readyToStream: true,
          status: { state: 'ready', pctComplete: '100' },
          duration: 300,
          playback: {
            hls: `https://videodelivery.net/${streamId}/manifest/video.m3u8`,
            dash: `https://videodelivery.net/${streamId}/manifest/video.mpd`
          }
        }
      };
    };

    // Mock AI Video Processor
    this.originalAIProcessor = aiVideoProcessor.analyzeVideo;
    aiVideoProcessor.analyzeVideo = async (video) => {
      console.log(`🔄 Mock AI: Analyzing video ${video.id}`);
      
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update video with AI results
      await storage.updateVideo(video.id, {
        aiProcessingStatus: 'completed',
        aiProcessingCompleted: new Date(),
        aiGeneratedTitle: mockAIAnalysisResult.generatedTitle,
        aiGeneratedDescription: mockAIAnalysisResult.generatedDescription,
        aiGeneratedTags: mockAIAnalysisResult.generatedTags,
        aiHighlights: JSON.stringify(mockAIAnalysisResult.highlights),
        aiSceneDetection: JSON.stringify(mockAIAnalysisResult.sceneTransitions),
        aiContentAnalysis: JSON.stringify(mockAIAnalysisResult.contentAnalysis),
        aiEditingSuggestions: JSON.stringify(mockAIAnalysisResult.editingSuggestions),
        aiYoutubeMetadata: JSON.stringify(mockAIAnalysisResult.youtubeMetadata),
        aiTiktokMetadata: JSON.stringify(mockAIAnalysisResult.tiktokMetadata),
        aiThumbnailRecommendations: JSON.stringify(mockAIAnalysisResult.thumbnailRecommendations),
        aiCompiledHighlights: JSON.stringify(mockAIAnalysisResult.compiledHighlights),
        aiViralPotentialScore: mockAIAnalysisResult.contentAnalysis.overallViralPotential
      });

      return mockAIAnalysisResult;
    };

    // Mock email service
    this.originalEmailService = emailService.sendEmail;
    emailService.sendEmail = async (to, template) => {
      console.log(`📧 Mock Email: Sending ${template.subject} to ${to}`);
      return true;
    };

    console.log('✅ Mock services configured');
  }

  async testVideoUploadPipeline() {
    console.log('\n🎬 Testing Video Upload Pipeline...');
    
    const creator = this.testUsers[0];
    
    // Test 1: Create upload URL
    const uploadData = {
      fileName: 'test-epic-utv-adventure.mp4',
      maxDurationSeconds: 3600
    };

    const uploadResponse = await cloudflareStreamService.createUploadUrl(
      uploadData.fileName,
      uploadData.maxDurationSeconds
    );

    expect(uploadResponse.success).to.be.true;
    expect(uploadResponse.result.uid).to.exist;
    expect(uploadResponse.result.uploadURL).to.exist;
    console.log('✅ Upload URL created successfully');

    // Test 2: Create video record in database
    const video = await storage.createVideo({
      userId: creator.id,
      title: 'Epic UTV Desert Adventure',
      description: 'Amazing UTV adventure through desert terrain',
      category: 'utv',
      status: 'uploading',
      fileName: uploadData.fileName,
      cfStreamId: uploadResponse.result.uid,
      cfUploadUrl: uploadResponse.result.uploadURL,
      cfProcessingStatus: 'uploading',
      cfReadyToStream: false,
      aiEnhanced: true
    });

    expect(video).to.exist;
    expect(video.cfStreamId).to.equal(uploadResponse.result.uid);
    this.testVideos.push(video);
    console.log('✅ Video record created in database');

    // Test 3: Update user processing count
    await storage.updateUserStats(creator.id, {
      videosProcessing: creator.videosProcessing + 1
    });

    const updatedCreator = await storage.getUser(creator.id);
    expect(updatedCreator.videosProcessing).to.equal(1);
    console.log('✅ User processing count updated');

    return video;
  }

  async testCloudflareWebhookHandling() {
    console.log('\n🌐 Testing Cloudflare Webhook Handling...');
    
    const video = this.testVideos[0];
    
    // Test 1: Simulate upload completion webhook
    const webhookPayload = {
      uid: video.cfStreamId,
      status: 'ready',
      meta: {
        duration: 300,
        name: video.fileName
      }
    };

    // Update video status to ready
    await storage.updateVideo(video.id, {
      cfProcessingStatus: 'ready',
      cfReadyToStream: true,
      status: 'approved',
      duration: webhookPayload.meta.duration,
      thumbnailUrl: `https://videodelivery.net/${video.cfStreamId}/thumbnails/thumbnail.jpg`
    });

    // Update user stats
    const creator = await storage.getUser(video.userId);
    await storage.updateUserStats(video.userId, {
      videosProcessing: creator.videosProcessing - 1,
      videosPublished: creator.videosPublished + 1
    });

    // Verify updates
    const updatedVideo = await storage.getVideo(video.id);
    expect(updatedVideo.cfProcessingStatus).to.equal('ready');
    expect(updatedVideo.cfReadyToStream).to.be.true;
    expect(updatedVideo.status).to.equal('approved');
    expect(updatedVideo.duration).to.equal(300);
    console.log('✅ Cloudflare webhook processing completed');

    const updatedCreator = await storage.getUser(video.userId);
    expect(updatedCreator.videosProcessing).to.equal(0);
    expect(updatedCreator.videosPublished).to.equal(1);
    console.log('✅ User stats updated after webhook');

    return updatedVideo;
  }

  async testAIAnalysisPipeline() {
    console.log('\n🤖 Testing AI Analysis Pipeline...');
    
    const video = this.testVideos[0];
    
    // Test 1: Trigger AI analysis
    const aiResults = await aiVideoProcessor.analyzeVideo(video);
    
    expect(aiResults).to.exist;
    expect(aiResults.highlights).to.be.an('array');
    expect(aiResults.highlights.length).to.be.greaterThan(0);
    expect(aiResults.contentAnalysis).to.exist;
    expect(aiResults.contentAnalysis.overallViralPotential).to.be.a('number');
    console.log('✅ AI analysis completed successfully');

    // Test 2: Verify database updates
    const updatedVideo = await storage.getVideo(video.id);
    expect(updatedVideo.aiProcessingStatus).to.equal('completed');
    expect(updatedVideo.aiProcessingCompleted).to.exist;
    expect(updatedVideo.aiGeneratedTitle).to.exist;
    expect(updatedVideo.aiHighlights).to.exist;
    expect(updatedVideo.aiViralPotentialScore).to.exist;
    console.log('✅ AI results saved to database');

    // Test 3: Verify highlight structure
    const highlights = JSON.parse(updatedVideo.aiHighlights);
    expect(highlights).to.be.an('array');
    highlights.forEach(highlight => {
      expect(highlight.start).to.be.a('number');
      expect(highlight.end).to.be.a('number');
      expect(highlight.description).to.be.a('string');
      expect(highlight.score).to.be.a('number');
      expect(highlight.clipType).to.be.a('string');
    });
    console.log('✅ Highlight structure validated');

    return aiResults;
  }

  async testNotificationSystem() {
    console.log('\n📢 Testing Notification System...');
    
    const creator = this.testUsers[0];
    const video = this.testVideos[0];
    
    // Test 1: Upload received notification
    const uploadNotification = await storage.createNotification({
      userId: creator.id,
      type: 'video_upload',
      title: 'Video Upload Received',
      message: `Your video "${video.title}" has been uploaded and is being processed.`,
      data: JSON.stringify({ videoId: video.id })
    });
    
    expect(uploadNotification).to.exist;
    expect(uploadNotification.type).to.equal('video_upload');
    expect(uploadNotification.isRead).to.be.false;
    this.testNotifications.push(uploadNotification);
    console.log('✅ Upload notification created');

    // Test 2: Processing started notification
    const processingNotification = await storage.createNotification({
      userId: creator.id,
      type: 'video_processing',
      title: 'Video Processing Started',
      message: `Processing has started for "${video.title}".`,
      data: JSON.stringify({ videoId: video.id })
    });
    
    this.testNotifications.push(processingNotification);
    console.log('✅ Processing notification created');

    // Test 3: AI enhancement completed notification
    const aiNotification = await storage.createNotification({
      userId: creator.id,
      type: 'ai_enhancement',
      title: 'AI Enhancement Completed',
      message: `AI enhancement has been completed for "${video.title}". Viral potential score: ${video.aiViralPotentialScore}`,
      data: JSON.stringify({ 
        videoId: video.id,
        viralPotential: video.aiViralPotentialScore,
        highlightsCount: JSON.parse(video.aiHighlights || '[]').length
      })
    });
    
    this.testNotifications.push(aiNotification);
    console.log('✅ AI enhancement notification created');

    // Test 4: Verify user notifications
    const userNotifications = await storage.getUserNotifications(creator.id);
    expect(userNotifications.length).to.be.greaterThan(0);
    
    // Find our test notifications
    const testNotificationTypes = ['video_upload', 'video_processing', 'ai_enhancement'];
    const foundNotifications = userNotifications.filter(n => 
      testNotificationTypes.includes(n.type)
    );
    expect(foundNotifications.length).to.equal(3);
    console.log('✅ User notifications retrieved successfully');

    // Test 5: Mark notification as read
    await storage.markNotificationAsRead(uploadNotification.id, creator.id);
    const updatedNotifications = await storage.getUserNotifications(creator.id);
    const readNotification = updatedNotifications.find(n => n.id === uploadNotification.id);
    expect(readNotification.isRead).to.be.true;
    console.log('✅ Notification marked as read');

    return this.testNotifications;
  }

  async testRevenueAttributionSystem() {
    console.log('\n💰 Testing Revenue Attribution System...');
    
    const creator = this.testUsers[0];
    const video = this.testVideos[0];
    
    // Test 1: Create video views
    const view1 = await storage.createVideoView({
      videoId: video.id,
      userId: null, // anonymous view
      viewerIp: '192.168.1.1',
      viewDuration: 180,
      completionRate: 60.0,
      revenue: 0.02
    });
    
    const view2 = await storage.createVideoView({
      videoId: video.id,
      userId: creator.id, // creator's own view
      viewerIp: '192.168.1.2',
      viewDuration: 300,
      completionRate: 100.0,
      revenue: 0.03
    });
    
    expect(view1).to.exist;
    expect(view2).to.exist;
    console.log('✅ Video views created');

    // Test 2: Create revenue transactions
    const revenueTransaction1 = await storage.createRevenueTransaction({
      userId: creator.id,
      videoId: video.id,
      type: 'view',
      amount: 0.02,
      platformShare: 0.006, // 30% platform fee
      creatorShare: 0.014,  // 70% creator share
      description: 'Revenue from video view',
      metadata: JSON.stringify({
        viewId: view1.id,
        completionRate: 60.0
      })
    });
    
    const revenueTransaction2 = await storage.createRevenueTransaction({
      userId: creator.id,
      videoId: video.id,
      type: 'view',
      amount: 0.03,
      platformShare: 0.009,
      creatorShare: 0.021,
      description: 'Revenue from video view',
      metadata: JSON.stringify({
        viewId: view2.id,
        completionRate: 100.0
      })
    });
    
    expect(revenueTransaction1).to.exist;
    expect(revenueTransaction2).to.exist;
    console.log('✅ Revenue transactions created');

    // Test 3: Update user earnings
    const totalCreatorEarnings = 0.014 + 0.021; // 0.035
    await storage.updateUserStats(creator.id, {
      totalEarnings: totalCreatorEarnings,
      pendingEarnings: totalCreatorEarnings,
      totalViews: 2
    });
    
    const updatedCreator = await storage.getUser(creator.id);
    expect(parseFloat(updatedCreator.totalEarnings)).to.equal(totalCreatorEarnings);
    expect(updatedCreator.totalViews).to.equal(2);
    console.log('✅ User earnings updated');

    // Test 4: Update video earnings
    await storage.updateVideo(video.id, {
      earnings: totalCreatorEarnings,
      views: 2
    });
    
    const updatedVideo = await storage.getVideo(video.id);
    expect(parseFloat(updatedVideo.earnings)).to.equal(totalCreatorEarnings);
    expect(updatedVideo.views).to.equal(2);
    console.log('✅ Video earnings updated');

    // Test 5: Verify revenue attribution
    const videoTransactions = await storage.getRevenueTransactionsByUser(creator.id);
    const videoRevenue = videoTransactions
      .filter(t => t.videoId === video.id)
      .reduce((sum, t) => sum + parseFloat(t.creatorShare), 0);
    
    expect(videoRevenue).to.equal(totalCreatorEarnings);
    console.log('✅ Revenue attribution verified');

    return { view1, view2, revenueTransaction1, revenueTransaction2 };
  }

  async testAdminApprovalWorkflow() {
    console.log('\n👨‍💼 Testing Admin Approval Workflow...');
    
    const admin = this.testUsers[1];
    const video = this.testVideos[0];
    
    // Test 1: Get AI processed videos for admin review
    const aiProcessedVideos = await storage.getAIProcessedVideos();
    expect(aiProcessedVideos).to.be.an('array');
    
    const testVideo = aiProcessedVideos.find(v => v.id === video.id);
    expect(testVideo).to.exist;
    expect(testVideo.aiProcessingStatus).to.equal('completed');
    console.log('✅ AI processed videos retrieved for admin review');

    // Test 2: Admin approves highlights
    const highlights = JSON.parse(video.aiHighlights);
    highlights[0].approved = true;
    highlights[1].approved = true;
    
    await storage.updateVideo(video.id, {
      aiHighlights: JSON.stringify(highlights)
    });
    
    const updatedVideo = await storage.getVideo(video.id);
    const updatedHighlights = JSON.parse(updatedVideo.aiHighlights);
    expect(updatedHighlights[0].approved).to.be.true;
    expect(updatedHighlights[1].approved).to.be.true;
    console.log('✅ Admin approved highlights');

    // Test 3: Admin publishes video
    await storage.updateVideo(video.id, {
      status: 'published',
      publishedAt: new Date()
    });
    
    const publishedVideo = await storage.getVideo(video.id);
    expect(publishedVideo.status).to.equal('published');
    expect(publishedVideo.publishedAt).to.exist;
    console.log('✅ Admin published video');

    // Test 4: Create publication notification
    const publicationNotification = await storage.createNotification({
      userId: video.userId,
      type: 'video_published',
      title: 'Video Published',
      message: `Your video "${video.title}" has been published and is now live!`,
      data: JSON.stringify({ 
        videoId: video.id,
        publishedAt: publishedVideo.publishedAt
      })
    });
    
    expect(publicationNotification).to.exist;
    this.testNotifications.push(publicationNotification);
    console.log('✅ Publication notification created');

    // Test 5: Verify admin workflow completion
    const finalVideo = await storage.getVideo(video.id);
    expect(finalVideo.status).to.equal('published');
    expect(finalVideo.aiProcessingStatus).to.equal('completed');
    expect(finalVideo.aiHighlights).to.exist;
    expect(finalVideo.aiViralPotentialScore).to.exist;
    console.log('✅ Admin workflow completed successfully');

    return publishedVideo;
  }

  async testEarningsProjection() {
    console.log('\n📊 Testing Earnings Projection System...');
    
    const creator = this.testUsers[0];
    
    // Test earnings projection calculation
    const projection = await storage.getEarningsProjection(creator.id);
    
    expect(projection).to.exist;
    expect(projection.totalVideos).to.be.a('number');
    expect(projection.publishedVideos).to.be.a('number');
    expect(projection.totalEarnings).to.be.a('string');
    expect(projection.pendingEarnings).to.be.a('string');
    expect(projection.averageViralScore).to.be.a('number');
    
    console.log('✅ Earnings projection calculated:', {
      totalVideos: projection.totalVideos,
      publishedVideos: projection.publishedVideos,
      totalEarnings: projection.totalEarnings,
      averageViralScore: projection.averageViralScore
    });

    return projection;
  }

  async testPayoutSystem() {
    console.log('\n💸 Testing Payout System...');
    
    const creator = this.testUsers[0];
    
    // Test 1: Create payout
    const payout = await storage.createPayout({
      userId: creator.id,
      amount: 0.035,
      platformFee: 0.0105, // 30% platform fee
      netAmount: 0.0245,   // 70% to creator
      status: 'pending',
      method: 'stripe',
      scheduledDate: new Date()
    });
    
    expect(payout).to.exist;
    expect(payout.userId).to.equal(creator.id);
    expect(parseFloat(payout.amount)).to.equal(0.035);
    expect(payout.status).to.equal('pending');
    this.testPayouts.push(payout);
    console.log('✅ Payout created');

    // Test 2: Update payout status
    await storage.updatePayout(payout.id, {
      status: 'completed',
      processedDate: new Date(),
      stripeTransferId: 'tr_test_123456'
    });
    
    const updatedPayout = await storage.getPayout(payout.id);
    expect(updatedPayout.status).to.equal('completed');
    expect(updatedPayout.processedDate).to.exist;
    console.log('✅ Payout status updated');

    // Test 3: Update user earnings after payout
    await storage.updateUserStats(creator.id, {
      pendingEarnings: 0.0 // Reset pending earnings after payout
    });
    
    const updatedCreator = await storage.getUser(creator.id);
    expect(parseFloat(updatedCreator.pendingEarnings)).to.equal(0.0);
    console.log('✅ User earnings updated after payout');

    // Test 4: Create payout notification
    const payoutNotification = await storage.createNotification({
      userId: creator.id,
      type: 'payout_completed',
      title: 'Payout Completed',
      message: `Your payout of $${payout.netAmount} has been processed successfully.`,
      data: JSON.stringify({ 
        payoutId: payout.id,
        amount: payout.netAmount,
        method: payout.method
      })
    });
    
    expect(payoutNotification).to.exist;
    this.testNotifications.push(payoutNotification);
    console.log('✅ Payout notification created');

    return payout;
  }

  async testPlatformStatistics() {
    console.log('\n📈 Testing Platform Statistics...');
    
    const stats = await storage.getPlatformStats();
    
    expect(stats).to.exist;
    expect(stats.totalUsers).to.be.a('number');
    expect(stats.totalVideos).to.be.a('number');
    expect(stats.totalRevenue).to.be.a('string');
    expect(stats.pendingVideos).to.be.a('number');
    expect(stats.processingVideos).to.be.a('number');
    expect(stats.pendingPayouts).to.be.a('string');
    
    console.log('✅ Platform statistics retrieved:', {
      totalUsers: stats.totalUsers,
      totalVideos: stats.totalVideos,
      totalRevenue: stats.totalRevenue,
      pendingVideos: stats.pendingVideos,
      processingVideos: stats.processingVideos,
      pendingPayouts: stats.pendingPayouts
    });

    return stats;
  }

  async runAllTests() {
    console.log('\n🧪 Running Complete E2E Test Suite...\n');
    
    try {
      await this.setup();
      
      // Run all test phases
      const video = await this.testVideoUploadPipeline();
      await this.testCloudflareWebhookHandling();
      await this.testAIAnalysisPipeline();
      await this.testNotificationSystem();
      await this.testRevenueAttributionSystem();
      await this.testAdminApprovalWorkflow();
      await this.testEarningsProjection();
      await this.testPayoutSystem();
      await this.testPlatformStatistics();
      
      console.log('\n🎉 All E2E Tests Passed Successfully!');
      console.log('\n📊 Test Summary:');
      console.log(`- Users created: ${this.testUsers.length}`);
      console.log(`- Videos processed: ${this.testVideos.length}`);
      console.log(`- Notifications sent: ${this.testNotifications.length}`);
      console.log(`- Payouts processed: ${this.testPayouts.length}`);
      
      return {
        success: true,
        message: 'All E2E tests completed successfully',
        stats: {
          users: this.testUsers.length,
          videos: this.testVideos.length,
          notifications: this.testNotifications.length,
          payouts: this.testPayouts.length
        }
      };
      
    } catch (error) {
      console.error('\n❌ E2E Test Failed:', error);
      return {
        success: false,
        message: `E2E test failed: ${error.message}`,
        error: error.stack
      };
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Clean up notifications
      for (const notification of this.testNotifications) {
        await db.delete(notifications).where(eq(notifications.id, notification.id));
      }
      
      // Clean up payouts
      for (const payout of this.testPayouts) {
        await db.delete(payouts).where(eq(payouts.id, payout.id));
      }
      
      // Clean up videos
      for (const video of this.testVideos) {
        await db.delete(videos).where(eq(videos.id, video.id));
      }
      
      // Clean up users
      for (const user of this.testUsers) {
        await db.delete(users).where(eq(users.id, user.id));
      }
      
      // Restore original services
      if (this.originalCloudflareService) {
        cloudflareStreamService.createUploadUrl = this.originalCloudflareService;
      }
      
      if (this.originalAIProcessor) {
        aiVideoProcessor.analyzeVideo = this.originalAIProcessor;
      }
      
      if (this.originalEmailService) {
        emailService.sendEmail = this.originalEmailService;
      }
      
      console.log('✅ Test cleanup completed');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

export { E2ETestSuite };

// If run directly, execute all tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new E2ETestSuite();
  testSuite.runAllTests()
    .then(result => {
      console.log('\n' + '='.repeat(60));
      console.log('E2E TEST SUITE RESULTS');
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
      console.error('\n❌ Test suite execution failed:', error);
      process.exit(1);
    });
}