# Cloudflare Stream Setup Instructions

## Required Configuration

To complete the video upload system integration, you need to:

1. **Get your Cloudflare Account ID:**
   - Go to https://dash.cloudflare.com/
   - Copy your Account ID from the right sidebar
   - Add it as a secret named `CF_ACCOUNT_ID` in Replit

2. **Verify CF_STREAM_TOKEN:**
   - Ensure your `CF_STREAM_TOKEN` secret is properly configured
   - This should be your Cloudflare Stream API token

3. **Set up Webhook URL (Optional but recommended):**
   - In Cloudflare Dashboard, go to Stream → Settings → Webhooks
   - Add webhook URL: `https://your-domain.replit.app/api/webhooks/cloudflare`
   - This enables automatic status updates when videos finish processing

## Current Error

The system is showing this error because the Cloudflare Account ID is not configured:
```
"Cloudflare Account ID not configured. Please set CF_ACCOUNT_ID environment variable or update the code with your account ID."
```

To fix this, you need to add your Cloudflare Account ID as a secret named `CF_ACCOUNT_ID`.

## Current Features Implemented

✅ **Direct Upload to Cloudflare Stream**
- Generates secure upload URLs with 1-hour expiration
- Supports files up to 2GB
- Direct client-to-Cloudflare upload (no server storage)

✅ **Progress Tracking**
- Real-time upload progress indicator
- Visual feedback during file transfer
- Automatic retry on upload failures

✅ **Processing Status Updates**
- Polls video processing status every 10 seconds
- Handles ready/error states appropriately
- Updates user statistics automatically

✅ **Database Integration**
- Stores Cloudflare Stream metadata
- Tracks processing status and errors
- Links videos to user accounts

✅ **Error Handling**
- Comprehensive error messages
- Graceful fallback for failed uploads
- User-friendly status indicators

## Testing the System

1. Navigate to /upload page
2. Drag and drop a video file or click to browse
3. Fill in video details (title, description, category)
4. Click "Upload Video"
5. Watch progress indicator during upload
6. System will poll for processing status until complete

## Next Steps

1. Replace `YOUR_ACCOUNT_ID` with your actual Cloudflare Account ID
2. Test the complete upload flow
3. Set up webhooks for instant status updates
4. Configure video playback in the dashboard