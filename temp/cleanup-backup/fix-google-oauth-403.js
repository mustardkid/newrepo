/**
 * Fix Google OAuth 403 error by providing exact configuration
 */

import fetch from 'node-fetch';

async function fixGoogleOAuth403() {
  console.log('🔧 FIXING GOOGLE OAUTH 403 ERROR\n');
  
  const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
  const currentDomain = domains[0];
  
  console.log('📍 Current Environment:');
  console.log('   Primary Domain:', currentDomain);
  console.log('   All Domains:', domains);
  console.log('   Google Client ID:', process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing');
  console.log('   Google Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing');
  
  // Test current OAuth endpoint
  console.log('\n🔍 Testing OAuth Endpoint:');
  try {
    const response = await fetch(`https://${currentDomain}/auth/google`, {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      console.log('   ✅ OAuth redirects to:', location?.substring(0, 150) + '...');
      
      // Extract redirect URI from the location
      const redirectUri = new URL(location).searchParams.get('redirect_uri');
      console.log('   📍 Redirect URI:', redirectUri);
    } else {
      console.log('   ❌ OAuth not working, status:', response.status);
    }
  } catch (error) {
    console.log('   ❌ OAuth test failed:', error.message);
  }
  
  console.log('\n🎯 GOOGLE CLOUD CONSOLE CONFIGURATION:');
  console.log('=====================================');
  console.log('Go to: https://console.cloud.google.com/apis/credentials');
  console.log('');
  console.log('Find your OAuth 2.0 Client ID and add these EXACT URIs:');
  console.log('');
  console.log('📍 Authorized JavaScript Origins:');
  console.log(`• https://${currentDomain}`);
  console.log('• https://partsnapp.app');
  console.log('• https://www.partsnapp.app');
  console.log('• http://localhost:5000');
  console.log('');
  console.log('📍 Authorized Redirect URIs:');
  console.log(`• https://${currentDomain}/auth/google/callback`);
  console.log('• https://partsnapp.app/auth/google/callback');
  console.log('• https://www.partsnapp.app/auth/google/callback');
  console.log('• http://localhost:5000/auth/google/callback');
  console.log('');
  console.log('⚠️  IMPORTANT: URIs must match EXACTLY (including https/http)');
  console.log('');
  console.log('🔧 QUICK FIX STEPS:');
  console.log('1. Copy the exact URIs above');
  console.log('2. Paste them into Google Cloud Console');
  console.log('3. Save the configuration');
  console.log('4. Wait 5-10 minutes for changes to propagate');
  console.log('5. Test the Google sign-in button again');
  console.log('');
  console.log('💡 COMMON ISSUES:');
  console.log('• 403 Error: Domain not authorized in Google Console');
  console.log('• redirect_uri_mismatch: Exact URI not added to allowed list');
  console.log('• unauthorized_client: Client ID mismatch or not configured');
  console.log('');
  console.log('🚀 After fixing, test at:');
  console.log(`   https://${currentDomain}`);
  console.log('   https://partsnapp.app');
  console.log('   https://www.partsnapp.app');
}

fixGoogleOAuth403();