# Google OAuth Verification Issues - Resolution Guide

## Current Status
- ✅ Homepage requirements - Completed
- ✅ Branding guidelines - Completed  
- ❌ Additional requirements - **Needs Resolution**

## Issues to Resolve

### 1. CASA Security Assessment ⚠️ **REQUIRED**

**What is CASA?**
- CASA (Cloud Application Security Assessment) is Google's security review process for apps requesting sensitive scopes.

**Action Required:**
1. **Check your email** - Google Trust and Safety team should have sent you an email with CASA assessment instructions
2. **Complete the CASA questionnaire** - Follow the link/instructions in the email
3. **Provide required documentation:**
   - Security practices documentation
   - Data handling procedures
   - Access controls and authentication methods
   - Data retention policies

**Timeline:** Usually takes 1-2 weeks for review

---

### 2. Privacy Policy Requirements ✅

**Status:** You already have a Privacy Policy page at `https://startworking.in/privacy-policy`

**Action Required:**
1. **Verify Privacy Policy is accessible:**
   - Visit: `https://startworking.in/privacy-policy`
   - Ensure it's publicly accessible (no login required)
   - Make sure it covers:
     - What data you collect
     - How you use Gmail data
     - How you store user data
     - User rights and data deletion

2. **Update OAuth Consent Screen:**
   - Go to: [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent)
   - Navigate to: **OAuth consent screen**
   - Add Privacy Policy URL: `https://startworking.in/privacy-policy`
   - Add Terms of Service URL: `https://startworking.in/terms-of-service`
   - Save changes

---

### 3. App Functionality

**What Google Needs:**
- Clear explanation of what your app does
- How Gmail scopes are used in your app

**Current Scopes Requested:**
- `gmail.send` - Used to send emails to recruiters
- `gmail.readonly` - Used to read recruiter replies

**Action Required:**
1. **Update OAuth Consent Screen - App Description:**
   - Go to: [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent)
   - Navigate to: **OAuth consent screen** → **App information**
   - **App description** should clearly state:
     ```
     JobSeeker is a job search platform that helps job seekers connect with recruiters. 
     Users connect their Gmail account to:
     - Send personalized emails to recruiters on their behalf
     - Receive and track recruiter replies in their conversation inbox
     
     Gmail access is only used for:
     - Sending job application emails
     - Reading recruiter replies to track conversations
     - No other Gmail data is accessed or stored
     ```

2. **Add Support Email:**
   - Add a support email address (e.g., `support@startworking.in`)
   - This email will receive verification updates

3. **Add Authorized Domains:**
   - Add: `startworking.in`
   - This verifies you own the domain

---

### 4. Appropriate Data Access

**What Google Checks:**
- Are you requesting only the scopes you need?
- Are you using the data appropriately?

**Current Scopes Analysis:**
- ✅ `gmail.send` - **Necessary** - Used to send emails to recruiters
- ✅ `gmail.readonly` - **Necessary** - Used to read recruiter replies

**Action Required:**
1. **Justify Each Scope in OAuth Consent Screen:**
   - Go to: [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent)
   - Navigate to: **OAuth consent screen** → **Scopes**
   - For each scope, add justification:

   **For `gmail.send`:**
   ```
   Required to send personalized job application emails to recruiters on behalf of the user. 
   Users compose emails in the app, and we send them via their connected Gmail account.
   ```

   **For `gmail.readonly`:**
   ```
   Required to read recruiter replies to track email conversations. 
   Users can see recruiter responses in their conversation inbox within the app.
   ```

2. **Add Video/Demo (Optional but Recommended):**
   - Create a 2-3 minute screen recording showing:
     - User connecting Gmail
     - Composing and sending an email
     - Receiving a recruiter reply
     - Viewing the reply in the conversation page
   - Upload to YouTube (unlisted) and add link in OAuth consent screen

---

### 5. Request Minimum Scopes

**Current Scopes:**
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly`

**Are These Minimum?**
- ✅ **Yes** - These are the minimum scopes needed:
  - You need `gmail.send` to send emails
  - You need `gmail.readonly` to read replies
  - You're NOT requesting broader scopes like `gmail.modify` or `gmail`

**Action Required:**
1. **Verify in Code:**
   - Check `src/pages/Compose.tsx` line 278:
     ```typescript
     const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly");
     ```
   - ✅ This is correct - only requesting necessary scopes

2. **Document in OAuth Consent Screen:**
   - In the scope justification, emphasize:
     - "We only request the minimum scopes needed"
     - "We do not request full Gmail access"
     - "We only access emails sent through our app and replies to those emails"

---

## Step-by-Step Resolution Checklist

### Step 1: Complete CASA Assessment
- [ ] Check email from Google Trust and Safety team
- [ ] Complete CASA questionnaire
- [ ] Submit required security documentation
- [ ] Wait for review (1-2 weeks)

### Step 2: Update Privacy Policy Links
- [ ] Verify Privacy Policy is accessible at `https://startworking.in/privacy-policy`
- [ ] Verify Terms of Service is accessible at `https://startworking.in/terms-of-service`
- [ ] Go to Google Cloud Console → OAuth consent screen
- [ ] Add Privacy Policy URL: `https://startworking.in/privacy-policy`
- [ ] Add Terms of Service URL: `https://startworking.in/terms-of-service`
- [ ] Save changes

### Step 3: Update App Information
- [ ] Go to Google Cloud Console → OAuth consent screen → App information
- [ ] Update App description (see template above)
- [ ] Add Support email: `support@startworking.in` (or your support email)
- [ ] Add Authorized domains: `startworking.in`
- [ ] Save changes

### Step 4: Justify Scopes
- [ ] Go to Google Cloud Console → OAuth consent screen → Scopes
- [ ] For `gmail.send`: Add justification (see above)
- [ ] For `gmail.readonly`: Add justification (see above)
- [ ] Save changes

### Step 5: Create Demo Video (Optional but Recommended)
- [ ] Record screen showing:
  - Gmail connection flow
  - Sending an email
  - Receiving a reply
  - Viewing conversation
- [ ] Upload to YouTube (unlisted)
- [ ] Add link in OAuth consent screen

### Step 6: Submit for Review
- [ ] Go to Google Cloud Console → OAuth consent screen
- [ ] Click "Submit for verification"
- [ ] Reply to the Trust and Safety team email thread
- [ ] Mention that you've resolved all issues
- [ ] Wait for review (usually 1-2 weeks)

---

## Important Notes

### ⚠️ CASA Assessment is Mandatory
- You **must** complete the CASA security assessment
- This is required for apps requesting sensitive scopes like Gmail
- Check your email for instructions from Google Trust and Safety team

### ✅ Privacy Policy Must Be Public
- Your Privacy Policy must be accessible without login
- It must clearly explain Gmail data usage
- Make sure it's linked in your OAuth consent screen

### 📝 Scope Justification is Critical
- Google needs to understand WHY you need each scope
- Be specific about how each scope is used
- Emphasize that you're requesting minimum necessary scopes

### 🎥 Demo Video Helps
- A short demo video significantly speeds up verification
- Shows Google exactly how your app uses Gmail
- Reduces back-and-forth questions

---

## Current App Scopes (Verified)

**File:** `src/pages/Compose.tsx` (line 278)
```typescript
const scope = encodeURIComponent(
  "https://www.googleapis.com/auth/gmail.send " +
  "https://www.googleapis.com/auth/gmail.readonly"
);
```

**These are the minimum scopes needed:**
- ✅ `gmail.send` - Send emails to recruiters
- ✅ `gmail.readonly` - Read recruiter replies

**You are NOT requesting:**
- ❌ `gmail.modify` - Full Gmail access
- ❌ `gmail` - All Gmail scopes
- ❌ Any other unnecessary scopes

---

## Timeline

1. **CASA Assessment:** 1-2 weeks (after submission)
2. **OAuth Consent Screen Updates:** Immediate (after saving)
3. **Google Review:** 1-2 weeks (after all issues resolved)
4. **Total:** 2-4 weeks from when you complete all requirements

---

## Support

If you need help:
1. Check the email thread from Google Trust and Safety team
2. Reply to that thread with specific questions
3. Google Cloud Console Support: [Support Page](https://cloud.google.com/support)

---

## Next Steps

1. **Immediate:** Update OAuth consent screen with Privacy Policy, Terms, and scope justifications
2. **Priority:** Complete CASA security assessment (check your email)
3. **Optional:** Create demo video to speed up verification
4. **Final:** Submit for review and reply to Trust and Safety team email

Good luck! 🚀

