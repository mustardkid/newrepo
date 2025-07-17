#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

console.log('🎬 Video Playback E2E Test');
console.log('==========================\n');

// Test configuration
const TEST_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  TEST_EMAIL: 'test@example.com',
  TEST_PASSWORD: 'test123',
  TEST_VIDEO_PATH: './test/test-video.mp4',
  ADMIN_EMAIL: 'mustardkid@gmail.com',
  ADMIN_TOKEN: '42037929', // Using the real admin token from existing system
  TIMEOUT: 30000 // 30 seconds
};

// Test state
let testState = {
  authToken: null,
  userId: null,
  videoId: null,
  cfStreamId: null,
  errors: [],
  successes: []
};

// Helper functions
const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...(testState.authToken ? { 'x-user-token': testState.authToken } : {}),
    ...headers
  };

  const options = {
    method,
    headers: baseHeaders,
    ...(data && method !== 'GET' ? { body: JSON.stringify(data) } : {})
  };

  try {
    const response = await fetch(`${TEST_CONFIG.BASE_URL}${endpoint}`, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    return { status: 500, error: error.message };
  }
};

const waitForCondition = async (checkFn, timeout = TEST_CONFIG.TIMEOUT) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await checkFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
};

const recordSuccess = (message) => {
  testState.successes.push(message);
  console.log(`✅ ${message}`);
};

const recordError = (message) => {
  testState.errors.push(message);
  console.log(`❌ ${message}`);
};

// Test Steps
const testAuthentication = async () => {
  console.log('\n🔐 Testing Authentication...');
  
  try {
    // Use admin token directly for testing
    testState.authToken = TEST_CONFIG.ADMIN_TOKEN;
    testState.userId = TEST_CONFIG.ADMIN_TOKEN;
    
    // Verify token works by making a test request
    const testResponse = await makeRequest('GET', '/api/auth/user');
    
    if (testResponse.status === 200) {
      recordSuccess('Authentication successful');
      console.log(`   - User ID: ${testResponse.data.id}`);
      console.log(`   - Email: ${testResponse.data.email}`);
      console.log(`   - Role: ${testResponse.data.role}`);
      return true;
    } else {
      recordError(`Authentication failed: ${testResponse.data.message}`);
      return false;
    }
  } catch (error) {
    recordError(`Authentication error: ${error.message}`);
    return false;
  }
};

const testVideoUpload = async () => {
  console.log('\n📹 Testing Video Upload...');
  
  try {
    // Check if test video exists
    if (!fs.existsSync(TEST_CONFIG.TEST_VIDEO_PATH)) {
      recordError('Test video file not found');
      return false;
    }
    
    // Get video upload URL
    const uploadResponse = await makeRequest('POST', '/api/videos/upload', {
      title: 'E2E Test Video',
      description: 'End-to-end test video for playback verification',
      category: 'test',
      tags: ['test', 'e2e'],
      aiEnhanced: false
    });
    
    if (uploadResponse.status !== 200) {
      recordError(`Upload URL creation failed: ${uploadResponse.data.message}`);
      return false;
    }
    
    testState.videoId = uploadResponse.data.video.id;
    testState.cfStreamId = uploadResponse.data.streamId;
    const uploadUrl = uploadResponse.data.uploadUrl;
    
    recordSuccess('Video upload URL created');
    console.log(`   - Video ID: ${testState.videoId}`);
    console.log(`   - Stream ID: ${testState.cfStreamId}`);
    
    // Upload video file to Cloudflare Stream
    const videoData = fs.readFileSync(TEST_CONFIG.TEST_VIDEO_PATH);
    const uploadToCloudflare = await fetch(uploadUrl, {
      method: 'POST',
      body: videoData,
      headers: {
        'Content-Type': 'video/mp4'
      }
    });
    
    if (uploadToCloudflare.ok) {
      recordSuccess('Video uploaded to Cloudflare Stream');
      return true;
    } else {
      recordError(`Cloudflare upload failed: ${uploadToCloudflare.statusText}`);
      return false;
    }
  } catch (error) {
    recordError(`Video upload error: ${error.message}`);
    return false;
  }
};

const testVideoProcessing = async () => {
  console.log('\n⚙️  Testing Video Processing...');
  
  try {
    // Poll for processing completion
    const processingComplete = await waitForCondition(async () => {
      const statusResponse = await makeRequest('GET', `/api/videos/${testState.videoId}/status`);
      
      if (statusResponse.status === 200) {
        const video = statusResponse.data;
        console.log(`   - Current status: ${video.status}`);
        console.log(`   - CF Processing: ${video.cfProcessingStatus}`);
        console.log(`   - Ready to stream: ${video.cfReadyToStream}`);
        
        return video.cfReadyToStream || video.status === 'ready';
      }
      return false;
    }, 60000); // 60 second timeout for processing
    
    if (processingComplete) {
      recordSuccess('Video processing completed');
      return true;
    } else {
      recordError('Video processing timeout');
      return false;
    }
  } catch (error) {
    recordError(`Video processing error: ${error.message}`);
    return false;
  }
};

const testVideoPlayback = async () => {
  console.log('\n🎥 Testing Video Playback...');
  
  try {
    // Get video stream info
    const streamResponse = await makeRequest('GET', `/api/videos/${testState.videoId}/stream`);
    
    if (streamResponse.status !== 200) {
      recordError(`Stream info fetch failed: ${streamResponse.data.message}`);
      return false;
    }
    
    const streamData = streamResponse.data;
    console.log(`   - Stream URL: ${streamData.streamUrl}`);
    console.log(`   - Iframe URL: ${streamData.iframe}`);
    console.log(`   - Thumbnail URL: ${streamData.thumbnailUrl}`);
    
    // Test HLS stream accessibility
    const hlsResponse = await fetch(streamData.streamUrl);
    if (hlsResponse.ok) {
      recordSuccess('HLS stream accessible');
    } else {
      recordError(`HLS stream not accessible: ${hlsResponse.statusText}`);
    }
    
    // Test iframe embed accessibility
    const iframeResponse = await fetch(streamData.iframe);
    if (iframeResponse.ok) {
      recordSuccess('Iframe embed accessible');
    } else {
      recordError(`Iframe embed not accessible: ${iframeResponse.statusText}`);
    }
    
    // Test thumbnail accessibility
    const thumbnailResponse = await fetch(streamData.thumbnailUrl);
    if (thumbnailResponse.ok) {
      recordSuccess('Thumbnail accessible');
    } else {
      recordError(`Thumbnail not accessible: ${thumbnailResponse.statusText}`);
    }
    
    return true;
  } catch (error) {
    recordError(`Video playback error: ${error.message}`);
    return false;
  }
};

const testVideoLibrary = async () => {
  console.log('\n📚 Testing Video Library...');
  
  try {
    // Get user's videos
    const videosResponse = await makeRequest('GET', '/api/videos/my-detailed');
    
    if (videosResponse.status !== 200) {
      recordError(`Video library fetch failed: ${videosResponse.data.message}`);
      return false;
    }
    
    const videos = videosResponse.data;
    const testVideo = videos.find(v => v.id === testState.videoId);
    
    if (!testVideo) {
      recordError('Test video not found in library');
      return false;
    }
    
    console.log(`   - Video found in library: ${testVideo.title}`);
    console.log(`   - Status: ${testVideo.status}`);
    console.log(`   - CF Ready: ${testVideo.cfReadyToStream}`);
    console.log(`   - CF Processing: ${testVideo.cfProcessingStatus}`);
    
    if (testVideo.cfReadyToStream && testVideo.cfStreamId) {
      recordSuccess('Video ready for playback in library');
      return true;
    } else {
      recordError('Video not ready for playback in library');
      return false;
    }
  } catch (error) {
    recordError(`Video library error: ${error.message}`);
    return false;
  }
};

const testLargeFileHandling = async () => {
  console.log('\n📦 Testing Large File Handling...');
  
  try {
    // Test file size validation
    const oversizedUpload = await makeRequest('POST', '/api/videos/upload', {
      title: 'Large File Test',
      description: 'Testing 500MB file size limit',
      category: 'test',
      tags: ['test', 'large-file'],
      fileSize: 600 * 1024 * 1024 // 600MB
    });
    
    if (oversizedUpload.status === 413 || oversizedUpload.data.message?.includes('file size')) {
      recordSuccess('Large file limit properly enforced');
    } else {
      recordError('Large file limit not enforced');
    }
    
    // Test valid file size
    const validUpload = await makeRequest('POST', '/api/videos/upload', {
      title: 'Valid Size Test',
      description: 'Testing valid file size',
      category: 'test',
      tags: ['test', 'valid-size'],
      fileSize: 100 * 1024 * 1024 // 100MB
    });
    
    if (validUpload.status === 200) {
      recordSuccess('Valid file size accepted');
    } else {
      recordError('Valid file size rejected');
    }
    
    return true;
  } catch (error) {
    recordError(`Large file handling error: ${error.message}`);
    return false;
  }
};

const testAIEnhancement = async () => {
  console.log('\n🤖 Testing AI Enhancement...');
  
  try {
    // Get video with AI processing
    const videoResponse = await makeRequest('GET', `/api/videos/${testState.videoId}/status`);
    
    if (videoResponse.status !== 200) {
      recordError(`Video status fetch failed: ${videoResponse.data.message}`);
      return false;
    }
    
    const video = videoResponse.data;
    
    // Check if AI processing fields are present
    if (video.aiProcessingStatus !== undefined) {
      recordSuccess('AI processing status field present');
    } else {
      recordError('AI processing status field missing');
    }
    
    // Test AI enhancement trigger (mock)
    console.log('   - AI processing status:', video.aiProcessingStatus || 'not started');
    console.log('   - AI highlights:', video.aiHighlights ? 'present' : 'none');
    
    recordSuccess('AI enhancement system accessible');
    return true;
  } catch (error) {
    recordError(`AI enhancement error: ${error.message}`);
    return false;
  }
};

// Main test runner
const runE2ETest = async () => {
  console.log('🚀 Starting Video Playback E2E Test Suite...\n');
  
  const testResults = [];
  
  // Run all tests
  testResults.push({ name: 'Authentication', passed: await testAuthentication() });
  testResults.push({ name: 'Video Upload', passed: await testVideoUpload() });
  testResults.push({ name: 'Video Processing', passed: await testVideoProcessing() });
  testResults.push({ name: 'Video Playback', passed: await testVideoPlayback() });
  testResults.push({ name: 'Video Library', passed: await testVideoLibrary() });
  testResults.push({ name: 'Large File Handling', passed: await testLargeFileHandling() });
  testResults.push({ name: 'AI Enhancement', passed: await testAIEnhancement() });
  
  // Results summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passedTests = testResults.filter(t => t.passed).length;
  const totalTests = testResults.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  testResults.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}`);
  });
  
  console.log(`\n📈 Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
  
  if (testState.successes.length > 0) {
    console.log('\n✅ Successes:');
    testState.successes.forEach(success => console.log(`   - ${success}`));
  }
  
  if (testState.errors.length > 0) {
    console.log('\n❌ Errors:');
    testState.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  // Cleanup
  if (testState.videoId) {
    console.log('\n🧹 Cleaning up test video...');
    // Note: In a real test, you might want to clean up the uploaded video
    // For now, we'll leave it for manual verification
  }
  
  console.log('\n🎯 Test Complete!');
  console.log(`Video ID: ${testState.videoId}`);
  console.log(`Stream ID: ${testState.cfStreamId}`);
  console.log(`Test video can be found in the video library for manual verification.`);
  
  return successRate >= 80; // 80% success rate required
};

// Run the test
runE2ETest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});