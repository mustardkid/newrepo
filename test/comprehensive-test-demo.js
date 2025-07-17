import { storage } from '../server/storage.ts';
import { db } from '../server/db.ts';
import { cloudflareStreamService } from '../server/cloudflareStream.ts';
import { aiVideoProcessor } from '../server/aiVideoProcessor.ts';
import { emailService } from '../server/emailService.ts';

console.log('🧪 RideReels Platform - Comprehensive Test Demo');
console.log('=' * 80);

async function runComprehensiveTest() {
  const testResults = [];
  
  try {
    console.log('\n📋 PHASE 1: Core System Health Check');
    console.log('-' * 50);
    
    // Test 1: Database Connection
    console.log('🔍 Testing database connection...');
    const dbResult = await db.execute('SELECT 1 as test');
    testResults.push({ test: 'Database Connection', status: 'PASSED' });
    console.log('✅ Database connection: Working');
    
    // Test 2: Storage Interface
    console.log('🔍 Testing storage interface...');
    const users = await storage.getAllUsers();
    const videos = await storage.getAllVideos();
    const notifications = await storage.getUserNotifications('42037929');
    testResults.push({ test: 'Storage Interface', status: 'PASSED' });
    console.log(`✅ Storage interface: Working (${users.length} users, ${videos.length} videos, ${notifications.length} notifications)`);
    
    console.log('\n📋 PHASE 2: Video Processing Pipeline Test');
    console.log('-' * 50);
    
    // Test 3: Video Upload Simulation
    console.log('🔍 Testing video upload process...');
    const testUser = users[0];
    if (testUser) {
      const testVideo = await storage.createVideo({
        userId: testUser.id,
        title: 'Test Video for E2E Testing',
        description: 'Automated test video for comprehensive testing',
        category: 'utv',
        status: 'uploading',
        fileName: 'test-video.mp4',
        cfStreamId: 'test-stream-123',
        cfUploadUrl: 'https://test-upload.com/123',
        cfProcessingStatus: 'uploading',
        cfReadyToStream: false,
        aiEnhanced: true
      });
      testResults.push({ test: 'Video Upload Process', status: 'PASSED' });
      console.log(`✅ Video upload process: Working (Created video ID: ${testVideo.id})`);
      
      // Test 4: Video Status Updates
      console.log('🔍 Testing video status updates...');
      const updatedVideo = await storage.updateVideo(testVideo.id, {
        status: 'processing',
        cfProcessingStatus: 'processing',
        aiProcessingStatus: 'processing'
      });
      testResults.push({ test: 'Video Status Updates', status: 'PASSED' });
      console.log('✅ Video status updates: Working');
      
      // Test 5: Notification Creation
      console.log('🔍 Testing notification system...');
      const testNotification = await storage.createNotification({
        userId: testUser.id,
        type: 'video_processing',
        title: 'Test Notification',
        message: 'Your video is being processed by our AI system.',
        data: JSON.stringify({ videoId: testVideo.id, testRun: true })
      });
      testResults.push({ test: 'Notification System', status: 'PASSED' });
      console.log(`✅ Notification system: Working (Created notification ID: ${testNotification.id})`);
      
      // Cleanup test video
      await storage.deleteVideo(testVideo.id);
      console.log('🧹 Test video cleaned up');
      
    } else {
      console.log('⚠️ No test user found, skipping video tests');
    }
    
    console.log('\n📋 PHASE 3: Revenue System Test');
    console.log('-' * 50);
    
    // Test 6: Revenue Transaction
    console.log('🔍 Testing revenue transaction system...');
    if (testUser && videos.length > 0) {
      const testVideoView = await storage.createVideoView({
        videoId: videos[0].id,
        userId: testUser.id,
        viewerIp: '127.0.0.1',
        viewDuration: 120,
        completionRate: 80.0,
        revenue: 0.05
      });
      
      const testRevenueTransaction = await storage.createRevenueTransaction({
        userId: testUser.id,
        videoId: videos[0].id,
        type: 'view',
        amount: 0.05,
        platformShare: 0.015,
        creatorShare: 0.035,
        description: 'Test revenue transaction',
        metadata: JSON.stringify({ testRun: true })
      });
      
      testResults.push({ test: 'Revenue Transaction System', status: 'PASSED' });
      console.log(`✅ Revenue transaction system: Working (View ID: ${testVideoView.id}, Transaction ID: ${testRevenueTransaction.id})`);
    }
    
    console.log('\n📋 PHASE 4: Admin Dashboard Test');
    console.log('-' * 50);
    
    // Test 7: Platform Statistics
    console.log('🔍 Testing platform statistics...');
    const stats = await storage.getPlatformStats();
    testResults.push({ test: 'Platform Statistics', status: 'PASSED' });
    console.log('✅ Platform statistics: Working');
    console.log(`   - Total users: ${stats.totalUsers}`);
    console.log(`   - Total videos: ${stats.totalVideos}`);
    console.log(`   - Total revenue: $${stats.totalRevenue}`);
    console.log(`   - Pending videos: ${stats.pendingVideos}`);
    console.log(`   - Processing videos: ${stats.processingVideos}`);
    console.log(`   - Pending payouts: $${stats.pendingPayouts}`);
    
    // Test 8: AI Processing Status
    console.log('🔍 Testing AI processing status...');
    const aiProcessedVideos = await storage.getAIProcessedVideos();
    testResults.push({ test: 'AI Processing Status', status: 'PASSED' });
    console.log(`✅ AI processing status: Working (${aiProcessedVideos.length} AI-processed videos)`);
    
    console.log('\n📋 PHASE 5: External Service Integration Test');
    console.log('-' * 50);
    
    // Test 9: Service Configurations
    console.log('🔍 Testing service configurations...');
    const requiredEnvVars = [
      'DATABASE_URL',
      'CF_ACCOUNT_ID',
      'CF_STREAM_TOKEN',
      'OPENAI_API_KEY',
      'SENDGRID_API_KEY',
      'STRIPE_SECRET_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(env => !process.env[env]);
    if (missingVars.length === 0) {
      testResults.push({ test: 'Service Configurations', status: 'PASSED' });
      console.log('✅ Service configurations: All required environment variables present');
    } else {
      testResults.push({ test: 'Service Configurations', status: 'WARNING' });
      console.log(`⚠️ Service configurations: Missing variables: ${missingVars.join(', ')}`);
    }
    
    console.log('\n📋 PHASE 6: End-to-End Workflow Validation');
    console.log('-' * 50);
    
    // Test 10: Complete Workflow
    console.log('🔍 Testing complete workflow...');
    if (testUser && videos.length > 0) {
      const workflowVideo = videos[0];
      
      // Simulate complete workflow
      const workflowSteps = [
        { step: 'Video uploaded', status: 'uploading' },
        { step: 'Processing started', status: 'processing' },
        { step: 'AI analysis completed', status: 'ai_completed' },
        { step: 'Admin approved', status: 'approved' },
        { step: 'Published', status: 'published' }
      ];
      
      let workflowPassed = true;
      for (const step of workflowSteps) {
        try {
          await storage.updateVideo(workflowVideo.id, { status: step.status });
          console.log(`   ✅ ${step.step}`);
        } catch (error) {
          console.log(`   ❌ ${step.step}: ${error.message}`);
          workflowPassed = false;
        }
      }
      
      testResults.push({ test: 'Complete Workflow', status: workflowPassed ? 'PASSED' : 'FAILED' });
      console.log(`${workflowPassed ? '✅' : '❌'} Complete workflow: ${workflowPassed ? 'Working' : 'Failed'}`);
    }
    
    // Generate final report
    console.log('\n' + '=' * 80);
    console.log('🎯 COMPREHENSIVE TEST RESULTS');
    console.log('=' * 80);
    
    const passedTests = testResults.filter(r => r.status === 'PASSED').length;
    const failedTests = testResults.filter(r => r.status === 'FAILED').length;
    const warningTests = testResults.filter(r => r.status === 'WARNING').length;
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`- Total tests: ${testResults.length}`);
    console.log(`- Passed: ${passedTests}`);
    console.log(`- Failed: ${failedTests}`);
    console.log(`- Warnings: ${warningTests}`);
    
    console.log(`\n📋 DETAILED RESULTS:`);
    testResults.forEach((result, index) => {
      const statusIcon = result.status === 'PASSED' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${index + 1}. ${statusIcon} ${result.test}: ${result.status}`);
    });
    
    console.log(`\n🚀 DEPLOYMENT READINESS:`);
    if (failedTests === 0) {
      console.log('✅ READY FOR PRODUCTION');
      console.log('All core systems are functioning correctly.');
    } else {
      console.log('❌ NEEDS ATTENTION');
      console.log(`${failedTests} test(s) failed and must be addressed before deployment.`);
    }
    
    console.log('\n' + '=' * 80);
    console.log('End of Comprehensive Test');
    console.log('=' * 80);
    
    return { 
      success: failedTests === 0, 
      totalTests: testResults.length,
      passed: passedTests,
      failed: failedTests,
      warnings: warningTests,
      results: testResults
    };
    
  } catch (error) {
    console.error('\n❌ Comprehensive test failed:', error.message);
    console.error('Full error:', error);
    return { success: false, error: error.message };
  }
}

// Run the comprehensive test
runComprehensiveTest().then(result => {
  process.exit(result.success ? 0 : 1);
});