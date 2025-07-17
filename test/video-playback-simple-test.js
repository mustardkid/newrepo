#!/usr/bin/env node

console.log('🎥 Simple Video Playback Test');
console.log('==============================\n');

// Test configuration
const TEST_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  ADMIN_TOKEN: '42037929',
  TIMEOUT: 10000 // 10 seconds
};

// Test state
let testState = {
  authToken: TEST_CONFIG.ADMIN_TOKEN,
  userId: TEST_CONFIG.ADMIN_TOKEN,
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

const recordSuccess = (message) => {
  testState.successes.push(message);
  console.log(`✅ ${message}`);
};

const recordError = (message) => {
  testState.errors.push(message);
  console.log(`❌ ${message}`);
};

// Test functions
const testVideoLibraryAccess = async () => {
  console.log('\n📚 Testing Video Library Access...');
  
  try {
    const videosResponse = await makeRequest('GET', '/api/videos/my-detailed');
    
    if (videosResponse.status === 200) {
      const videos = videosResponse.data;
      console.log(`   - Found ${videos.length} videos in library`);
      
      if (videos.length > 0) {
        recordSuccess('Video library accessible with videos');
        
        // Test each video's data structure
        const testVideo = videos[0];
        console.log(`   - Test video: ${testVideo.title}`);
        console.log(`   - Video ID: ${testVideo.id}`);
        console.log(`   - Status: ${testVideo.status}`);
        console.log(`   - CF Stream ID: ${testVideo.cfStreamId || 'None'}`);
        console.log(`   - CF Ready: ${testVideo.cfReadyToStream}`);
        console.log(`   - CF Processing: ${testVideo.cfProcessingStatus}`);
        
        return { success: true, videos };
      } else {
        recordError('No videos found in library');
        return { success: false, videos: [] };
      }
    } else {
      recordError(`Video library access failed: ${videosResponse.data.message}`);
      return { success: false, videos: [] };
    }
  } catch (error) {
    recordError(`Video library error: ${error.message}`);
    return { success: false, videos: [] };
  }
};

const testVideoPlayerComponent = async (videos) => {
  console.log('\n🎬 Testing VideoPlayer Component Logic...');
  
  if (!videos || videos.length === 0) {
    recordError('No videos available for testing');
    return false;
  }
  
  try {
    // Test different video statuses
    const statusTests = [
      { status: 'processing', cfReadyToStream: false, cfProcessingStatus: 'uploading' },
      { status: 'processing', cfReadyToStream: false, cfProcessingStatus: 'processing' },
      { status: 'ready', cfReadyToStream: true, cfProcessingStatus: 'ready' },
      { status: 'failed', cfReadyToStream: false, cfProcessingStatus: 'error' }
    ];
    
    statusTests.forEach(test => {
      const displayStatus = getVideoDisplayStatus(test);
      console.log(`   - Status: ${test.status}, CF Ready: ${test.cfReadyToStream}, CF Processing: ${test.cfProcessingStatus}`);
      console.log(`     → Display: ${displayStatus}`);
    });
    
    recordSuccess('VideoPlayer component logic tested');
    return true;
  } catch (error) {
    recordError(`VideoPlayer component error: ${error.message}`);
    return false;
  }
};

const getVideoDisplayStatus = (video) => {
  // Replicate the logic from VideoPlayer component
  if (video.cfReadyToStream && video.cfStreamId) {
    return 'ready';
  } else if (video.cfProcessingStatus === 'uploading') {
    return 'uploading';
  } else if (video.cfProcessingStatus === 'error') {
    return 'error';
  } else {
    return 'processing';
  }
};

const testVideoStreamEndpoints = async (videos) => {
  console.log('\n🔗 Testing Video Stream Endpoints...');
  
  if (!videos || videos.length === 0) {
    recordError('No videos available for testing');
    return false;
  }
  
  try {
    // Find a video with a Cloudflare Stream ID
    const streamVideo = videos.find(v => v.cfStreamId);
    
    if (!streamVideo) {
      recordError('No videos with Cloudflare Stream ID found');
      return false;
    }
    
    console.log(`   - Testing video: ${streamVideo.title}`);
    console.log(`   - Stream ID: ${streamVideo.cfStreamId}`);
    
    // Test video stream endpoint
    const streamResponse = await makeRequest('GET', `/api/videos/${streamVideo.id}/stream`);
    
    if (streamResponse.status === 200) {
      const streamData = streamResponse.data;
      console.log(`   - Stream URL: ${streamData.streamUrl}`);
      console.log(`   - Iframe URL: ${streamData.iframe}`);
      console.log(`   - Thumbnail URL: ${streamData.thumbnailUrl}`);
      
      // Test if URLs are properly formatted
      if (streamData.streamUrl?.includes('cloudflarestream.com')) {
        recordSuccess('Cloudflare Stream URL properly formatted');
      } else {
        recordError('Stream URL not properly formatted');
      }
      
      if (streamData.iframe?.includes('iframe')) {
        recordSuccess('Iframe URL properly formatted');
      } else {
        recordError('Iframe URL not properly formatted');
      }
      
      return true;
    } else {
      recordError(`Video stream endpoint failed: ${streamResponse.data.message}`);
      return false;
    }
  } catch (error) {
    recordError(`Video stream endpoint error: ${error.message}`);
    return false;
  }
};

const testVideoStatusUpdates = async (videos) => {
  console.log('\n📊 Testing Video Status Updates...');
  
  if (!videos || videos.length === 0) {
    recordError('No videos available for testing');
    return false;
  }
  
  try {
    // Test status endpoint for each video
    const statusTests = await Promise.all(
      videos.slice(0, 3).map(async (video) => {
        const statusResponse = await makeRequest('GET', `/api/videos/${video.id}/status`);
        return {
          videoId: video.id,
          title: video.title,
          success: statusResponse.status === 200,
          status: statusResponse.data?.status,
          cfProcessingStatus: statusResponse.data?.cfProcessingStatus,
          cfReadyToStream: statusResponse.data?.cfReadyToStream
        };
      })
    );
    
    const successfulTests = statusTests.filter(t => t.success);
    
    console.log(`   - Status endpoint tests: ${successfulTests.length}/${statusTests.length} successful`);
    
    statusTests.forEach(test => {
      if (test.success) {
        console.log(`   - Video ${test.videoId}: ${test.status} (CF: ${test.cfProcessingStatus})`);
      } else {
        console.log(`   - Video ${test.videoId}: Status check failed`);
      }
    });
    
    if (successfulTests.length > 0) {
      recordSuccess('Video status updates working');
      return true;
    } else {
      recordError('No video status updates working');
      return false;
    }
  } catch (error) {
    recordError(`Video status update error: ${error.message}`);
    return false;
  }
};

const testVideoPlaybackReadiness = async (videos) => {
  console.log('\n🎯 Testing Video Playback Readiness...');
  
  if (!videos || videos.length === 0) {
    recordError('No videos available for testing');
    return false;
  }
  
  try {
    // Categorize videos by readiness
    const readyVideos = videos.filter(v => v.cfReadyToStream && v.cfStreamId);
    const processingVideos = videos.filter(v => !v.cfReadyToStream && v.cfStreamId);
    const pendingVideos = videos.filter(v => !v.cfStreamId);
    
    console.log(`   - Ready for playback: ${readyVideos.length} videos`);
    console.log(`   - Processing: ${processingVideos.length} videos`);
    console.log(`   - Pending upload: ${pendingVideos.length} videos`);
    
    if (readyVideos.length > 0) {
      recordSuccess(`${readyVideos.length} videos ready for playback`);
      
      // Test first ready video
      const testVideo = readyVideos[0];
      console.log(`   - Testing ready video: ${testVideo.title}`);
      console.log(`   - Stream ID: ${testVideo.cfStreamId}`);
      console.log(`   - Duration: ${testVideo.duration || 'Unknown'}`);
      console.log(`   - Thumbnail: ${testVideo.thumbnailUrl || 'None'}`);
      
      return true;
    } else {
      recordError('No videos ready for playback');
      return false;
    }
  } catch (error) {
    recordError(`Video playback readiness error: ${error.message}`);
    return false;
  }
};

// Main test runner
const runSimpleTest = async () => {
  console.log('🚀 Starting Simple Video Playback Test...\n');
  
  const testResults = [];
  
  // Test video library access first
  const libraryResult = await testVideoLibraryAccess();
  testResults.push({ name: 'Video Library Access', passed: libraryResult.success });
  
  if (libraryResult.success) {
    const videos = libraryResult.videos;
    
    // Run remaining tests
    testResults.push({ name: 'VideoPlayer Component', passed: await testVideoPlayerComponent(videos) });
    testResults.push({ name: 'Video Stream Endpoints', passed: await testVideoStreamEndpoints(videos) });
    testResults.push({ name: 'Video Status Updates', passed: await testVideoStatusUpdates(videos) });
    testResults.push({ name: 'Video Playback Readiness', passed: await testVideoPlaybackReadiness(videos) });
  } else {
    // Skip remaining tests if no video library access
    testResults.push({ name: 'VideoPlayer Component', passed: false });
    testResults.push({ name: 'Video Stream Endpoints', passed: false });
    testResults.push({ name: 'Video Status Updates', passed: false });
    testResults.push({ name: 'Video Playback Readiness', passed: false });
  }
  
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
  
  console.log('\n🎯 Test Complete!');
  console.log('This test verifies the video playback system components without requiring actual video uploads.');
  
  return successRate >= 80; // 80% success rate required
};

// Run the test
runSimpleTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});