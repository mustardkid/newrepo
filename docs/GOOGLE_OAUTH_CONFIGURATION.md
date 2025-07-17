# Google OAuth Configuration Guide

## Current Issue
The error "invalid_client" (Error 401) indicates that the Google OAuth client configuration in Google Cloud Console doesn't match the credentials stored in the environment variables.

## Root Cause
The GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the Replit secrets may be from a different project or incorrectly configured in Google Cloud Console.

## Solution Steps

### 1. Google Cloud Console Setup

1. **Navigate to Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Select your project (ID: 987272436634)

2. **Create OAuth 2.0 Client ID**
   - Go to: APIs & Services > Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "RideReels Platform"

3. **Configure Authorized JavaScript Origins**
   ```
   http://localhost:5000
   https://partsnapp.app
   https://www.partsnapp.app
   https://ridereels.replit.app
   ```

4. **Configure Authorized Redirect URIs**
   ```
   http://localhost:5000/auth/google/callback
   https://partsnapp.app/auth/google/callback
   https://www.partsnapp.app/auth/google/callback
   https://ridereels.replit.app/auth/google/callback
   ```

5. **Save and Copy Credentials**
   - Click "Create"
   - Copy the Client ID and Client Secret
   - Update the Replit secrets with these new values

### 2. Firebase Console Setup

1. **Navigate to Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Select your project

2. **Configure Authorized Domains**
   - Go to: Authentication > Settings > Authorized domains
   - Add these domains:
     ```
     localhost
     partsnapp.app
     www.partsnapp.app
     ridereels.replit.app
     ```

3. **Enable Google Sign-in Method**
   - Go to: Authentication > Sign-in method
   - Enable "Google" provider
   - Use the same OAuth client ID from step 1 above

### 3. Environment Variables Update

Update these secrets in your Replit environment:
- `GOOGLE_CLIENT_ID`: The new client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: The new client secret from Google Cloud Console

### 4. Testing

After configuration:
1. Restart the application
2. Test Google sign-in from the browser
3. Verify both Google OAuth and Firebase authentication work

## Important Notes

- Both Google Cloud Console AND Firebase Console must be configured
- The OAuth client must be created in the same Google Cloud project as your other services
- Domain authorization is required in both consoles
- The Firebase project should use the same Google Cloud project

## Current Project Information

- **Project ID**: 987272436634
- **Primary Domain**: partsnapp.app
- **Development URL**: http://localhost:5000
- **Production URLs**: https://partsnapp.app, https://www.partsnapp.app

## Backend Configuration Status

The RideReels backend is already configured to handle Google OAuth:
- ✅ Google OAuth token verification endpoint: `/api/auth/google/token`
- ✅ Authentication middleware supports Google OAuth sessions
- ✅ CORS configured for all deployment domains
- ✅ Fallback authentication methods (simple email, Firebase) working
- ✅ Database integration for user management

Once the Google Cloud Console is properly configured, the authentication system will work seamlessly.