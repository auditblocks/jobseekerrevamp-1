# Quick Fix Guide - Google OAuth Verification Issues

## 🎯 Summary

You have **5 issues** to resolve for Google OAuth verification:

1. ✅ **Privacy Policy** - Already done! Your Privacy Policy at `https://startworking.in/privacy-policy` covers Gmail usage
2. ⚠️ **CASA Security Assessment** - **MANDATORY** - Check your email from Google Trust and Safety team
3. 📝 **App Functionality** - Update OAuth consent screen description
4. 🔐 **Appropriate Data Access** - Justify Gmail scopes
5. ✅ **Request Minimum Scopes** - Already correct! You're only requesting `gmail.send` and `gmail.readonly`

---

## 🚀 Quick Action Steps (15 minutes)

### Step 1: Update OAuth Consent Screen (5 min)

1. Go to: [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Click **"EDIT APP"**

3. **App Information Section:**
   - **App name:** JobSeeker (or Startworking)
   - **User support email:** Your support email (e.g., `support@startworking.in`)
   - **App logo:** Upload your app logo (optional)
   - **App domain:** `startworking.in`
   - **Application home page:** `https://startworking.in`
   - **Privacy Policy link:** `https://startworking.in/privacy-policy` ✅
   - **Terms of Service link:** `https://startworking.in/terms-of-service` ✅
   - **Authorized domains:** `startworking.in`

4. **App Description:**
   ```
   JobSeeker is a job search platform that helps job seekers connect with recruiters. 
   Users connect their Gmail account to send personalized emails to recruiters and track 
   recruiter replies in their conversation inbox. Gmail access is only used for sending 
   job application emails and reading recruiter replies - no other Gmail data is accessed.
   ```

5. **Scopes Section:**
   - For `gmail.send` - Add justification:
     ```
     Required to send personalized job application emails to recruiters on behalf of the user. 
     Users compose emails in the app, and we send them via their connected Gmail account.
     ```
   
   - For `gmail.readonly` - Add justification:
     ```
     Required to read recruiter replies to track email conversations. 
     Users can see recruiter responses in their conversation inbox within the app.
     ```

6. Click **"SAVE AND CONTINUE"**

---

### Step 2: Access CASA Assessment ⚠️ **MOST IMPORTANT**

**If you haven't received an email, try these methods:**

**Method A: Check OAuth Consent Screen Directly**
1. Go to: [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Look for "Security Assessment" or "CASA" link in the verification status section
3. Click on it to access the questionnaire

**Method B: Submit for Verification First**
1. Complete Step 1 above (OAuth consent screen setup)
2. Click "Submit for Verification"
3. Google will send CASA assessment email within 1-3 business days
4. Check all email addresses (primary, support, spam folders)

**Method C: Check All Email Addresses**
- Check the email associated with your Google Cloud account
- Check the support email listed in OAuth consent screen
- Search for: "CASA", "Security Assessment", "Trust and Safety"
- Check spam/junk folders

**If still no email after 1 week:** Contact Google Cloud Support

**Note:** CASA is MANDATORY and cannot be skipped. See `CASA_ASSESSMENT_ACCESS.md` for detailed instructions.

---

### Step 3: Submit for Review

1. After completing all steps above, go back to OAuth Consent Screen
2. Click **"SUBMIT FOR VERIFICATION"**
3. Reply to the Trust and Safety team email thread
4. Mention: "I have resolved all issues and updated the OAuth consent screen. Please proceed with verification."

---

## ✅ What's Already Done

- ✅ Privacy Policy exists and covers Gmail usage
- ✅ Terms of Service exists
- ✅ Only requesting minimum scopes (`gmail.send` + `gmail.readonly`)
- ✅ Homepage requirements met
- ✅ Branding guidelines met

---

## 📋 Checklist

- [ ] Update OAuth consent screen with Privacy Policy and Terms links
- [ ] Add app description explaining Gmail usage
- [ ] Add scope justifications for `gmail.send` and `gmail.readonly`
- [ ] Add support email and authorized domain
- [ ] Check email for CASA assessment instructions
- [ ] Complete CASA security assessment
- [ ] Submit for verification
- [ ] Reply to Trust and Safety team email

---

## ⏱️ Timeline

- **OAuth Consent Screen Updates:** 15 minutes
- **CASA Assessment:** 1-2 hours (depends on documentation you have)
- **Google Review:** 1-2 weeks after submission
- **Total:** 2-4 weeks from completion

---

## 🆘 Need Help?

1. **CASA Assessment Questions:** Reply to the Trust and Safety team email
2. **OAuth Consent Screen Issues:** Check [Google Cloud Console Help](https://cloud.google.com/apis/docs/oauth-consent-screen)
3. **Scope Justification:** See detailed guide in `GOOGLE_VERIFICATION_ISSUES_FIX.md`

---

## 📝 Current App Scopes (Verified Correct)

Your app is correctly requesting only:
- ✅ `gmail.send` - To send emails
- ✅ `gmail.readonly` - To read replies

**No changes needed to scopes!** ✅

---

**Priority:** Complete CASA assessment first, then update OAuth consent screen, then submit for review.

