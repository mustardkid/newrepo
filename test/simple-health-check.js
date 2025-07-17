import { storage } from '../server/storage.ts';
import { db } from '../server/db.ts';

console.log('🧪 RideReels Platform - Simple Health Check');
console.log('=' * 50);

async function runHealthCheck() {
  try {
    console.log('Testing database connection...');
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection: Working');
    
    console.log('Testing storage interface...');
    const users = await storage.getAllUsers();
    console.log(`✅ Storage interface: Working (${users.length} users found)`);
    
    console.log('Testing video operations...');
    const videos = await storage.getAllVideos();
    console.log(`✅ Video operations: Working (${videos.length} videos found)`);
    
    console.log('Testing notification system...');
    const notifications = await storage.getUserNotifications('42037929');
    console.log(`✅ Notification system: Working (${notifications.length} notifications found)`);
    
    console.log('\n🎉 Health check passed! All core systems are working.');
    console.log('\n📊 System Status:');
    console.log(`- Total users: ${users.length}`);
    console.log(`- Total videos: ${videos.length}`);
    console.log(`- Total notifications: ${notifications.length}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.error('Full error:', error);
    return { success: false, error: error.message };
  }
}

// Run the health check
runHealthCheck().then(result => {
  process.exit(result.success ? 0 : 1);
});