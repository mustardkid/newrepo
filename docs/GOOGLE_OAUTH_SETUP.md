# Google OAuth Configuration Guide

## Current Issue: 403 Error Fix

The 403 error occurs because the redirect URI in Google Cloud Console doesn't match the exact URI being used by the application.

## Required Google Cloud Console Configuration

Go to: https://console.cloud.google.com/apis/credentials

### 1. Authorized JavaScript Origins
Add these exact domains:
```
https://52626be7-ab7c-44d7-87eb-10618be2a952-00-1cphe3vrgwvok.worf.replit.dev
https://partsnapp.app
https://www.partsnapp.app
http://localhost:5000
```

### 2. Authorized Redirect URIs
Add these exact callback URIs:
```
https://52626be7-ab7c-44d7-87eb-10618be2a952-00-1cphe3vrgwvok.worf.replit.dev/auth/google/callback
https://partsnapp.app/auth/google/callback
https://www.partsnapp.app/auth/google/callback
http://localhost:5000/auth/google/callback
```

## Environment Variables Required

The following secrets are configured in Replit:
- `GOOGLE_CLIENT_ID` - OAuth 2.0 Client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth 2.0 Client Secret from Google Cloud Console
- `SESSION_SECRET` - Session encryption secret

## OAuth Flow

1. User clicks "Continue with Google" button
2. Backend redirects to `/auth/google` endpoint
3. Passport.js redirects to Google OAuth with proper scopes
4. Google redirects back to `/auth/google/callback` with authorization code
5. Backend exchanges code for access token and user profile
6. User is created/updated in database and session is established
7. User is redirected to appropriate dashboard (admin or creator)

## Testing

After updating Google Cloud Console:
1. Wait 5-10 minutes for changes to propagate
2. Test on current Replit domain
3. Test on custom domains (partsnapp.app, www.partsnapp.app)
4. Verify user is properly authenticated and redirected

## Troubleshooting

- **403 Error**: Domain not authorized in Google Console
- **redirect_uri_mismatch**: Exact URI not in allowed list
- **unauthorized_client**: Client ID mismatch or misconfigured
- **access_denied**: User canceled or app needs approval

## Current Status

✅ Backend OAuth implementation complete
✅ Session management configured
✅ Database integration working
✅ Role-based redirects implemented
⚠️ Google Cloud Console URIs need to be added