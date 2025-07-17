# Google OAuth Configuration Guide

## Current Status
✅ Google OAuth is properly configured in the backend
✅ Client ID and Secret are loaded correctly  
✅ Passport strategy is working with authorization code flow
✅ Callback URLs are configured correctly

## The Issue
The "accounts.google.com refused to connect" error occurs because the current development domain isn't authorized in Google Cloud Console.

## Required Google Cloud Console Configuration

### 1. Go to Google Cloud Console
- Navigate to: https://console.cloud.google.com/
- Select project: **"ridereels"** (Project Number: 987272436634)
- Go to "APIs & Services" > "Credentials"

### 2. Find Your OAuth 2.0 Client ID
- Look for the client ID starting with: `987272436634-...`
- Current Client ID: `987272436634-v21j18vmdgmmlgtkbths4h6djhdhu2dg.apps.googleusercontent.com`
- Click "Edit" (pencil icon)

### 3. Add Authorized Redirect URIs
Add these URLs to the "Authorized redirect URIs" section:

**Development:**
- `http://localhost:5000/auth/google/callback`

**Production:**
- `https://ride-reels-platform-mustardkid.replit.app/auth/google/callback`

**Current Replit Domain:**
- `https://52626be7-ab7c-44d7-87eb-10618be2a952-00-1cphe3vrgwvok.worf.replit.dev/auth/google/callback`

### 4. Save Changes
Click "Save" in Google Cloud Console

## OAuth Flow Details
- **Authorization URL**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Scopes**: `profile email`
- **Response Type**: `code` (authorization code flow)
- **Client ID**: `987272436634-v21j18vmdgmmlgtkbths4h6djhdhu2dg.apps.googleusercontent.com`

## Testing
Once the redirect URIs are added to Google Cloud Console:
1. Click "Continue with Google" on the landing page
2. You'll be redirected to Google's authorization page
3. After authorization, you'll be redirected back to RideReels
4. The system will create/update your user account and log you in

## Notes
- The backend OAuth implementation is working correctly
- The issue is purely a domain authorization problem in Google Cloud Console
- All three authentication methods (Simple, Google OAuth, Firebase) will work once configured