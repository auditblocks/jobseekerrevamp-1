# Fix Google OAuth Scope Mismatch

## Problem
Your app is requesting Gmail scopes that are not configured in your Google Cloud Console OAuth consent screen.

## Required Scopes
Your application requests this scope:
- `https://www.googleapis.com/auth/gmail.send`

**Note:** `gmail.readonly` scope was removed to avoid CASA (Customer Application Security Assessment) requirement. This means the automatic reply checking feature (`check-gmail-replies`) will not work, but email sending will continue to function.

## Solution Steps

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with your OAuth credentials)

### Step 2: Navigate to OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Or directly: https://console.cloud.google.com/apis/credentials/consent

### Step 3: Add Required Scopes
1. Scroll down to the **"Scopes"** section
2. Click **"ADD OR REMOVE SCOPES"** button
3. In the scope selection dialog:
   - Search for "Gmail API" or filter by "Gmail"
   - Check the following scope:
     - ✅ `https://www.googleapis.com/auth/gmail.send` - Send email on your behalf
   - ⚠️ **Do NOT add** `gmail.readonly` - This requires CASA assessment
4. Click **"UPDATE"** to save

### Step 4: Verify Scope Configuration
1. After adding scopes, you should see it listed in the "Scopes" section
2. Make sure only this scope is visible:
   - `https://www.googleapis.com/auth/gmail.send`

### Step 5: Save and Continue
1. Click **"SAVE AND CONTINUE"** at the bottom
2. Complete any remaining steps in the OAuth consent screen setup
3. If your app is in "Testing" mode, you may need to add test users

### Step 6: Verify the Fix
1. The warning should disappear after a few minutes
2. Try connecting Gmail again from your app
3. The consent screen should now show the correct scopes

## Important Notes

### For Production Apps
- If your app is in "Production" mode, Google will review your scope usage
- Make sure your app's privacy policy and terms of service mention Gmail access
- The scopes must match exactly what your app requests

### For Testing Apps
- If your app is in "Testing" mode, only test users can connect
- Add your email and any test user emails to the "Test users" list
- You can have up to 100 test users

### Scope Descriptions
- **gmail.send**: Allows the app to send emails on behalf of the user

### Important: Reply Checking Feature
- The `check-gmail-replies` edge function requires `gmail.readonly` scope to work
- Since we're not requesting this scope (to avoid CASA), automatic reply checking is disabled
- Users will need to manually check their email for replies, or you can implement an alternative solution

## Troubleshooting

### If scopes still don't match:
1. Clear your browser cache
2. Wait 5-10 minutes for Google's systems to update
3. Check that you're editing the correct OAuth client ID
4. Verify the scopes in your code match exactly (case-sensitive)

### If you see "App not verified" warning:
- This is normal for apps in testing mode
- Users will see a warning but can still proceed
- To remove the warning, submit your app for verification (production mode)

## Code Reference

The scope is configured in:
- **File**: `src/pages/Compose.tsx`
- **Line**: 306
- **Code**: 
  ```typescript
  const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.send");
  ```

Make sure this exact scope is in your Google Cloud Console OAuth consent screen.

## Impact of Removing gmail.readonly

**What Still Works:**
- ✅ Sending emails via Gmail API
- ✅ All email composition features
- ✅ Email tracking (opens, clicks via tracking pixels)

**What Won't Work:**
- ❌ Automatic reply checking (`check-gmail-replies` function)
- ❌ Automatic conversation thread updates from incoming emails
- ❌ Gmail webhook functionality (requires readonly)

**Alternative Solutions:**
1. Use email tracking pixels to detect when emails are opened/clicked
2. Implement a manual "Check Replies" button that users can click
3. Use email webhooks from your email service provider (if available)
4. Consider implementing CASA assessment in the future if reply checking is critical

