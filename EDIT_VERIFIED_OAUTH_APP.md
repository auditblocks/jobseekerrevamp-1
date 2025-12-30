# How to Edit Verified OAuth Consent Screen

## 🔒 Why You Can't Edit

When your **Branding is verified**, Google locks certain fields to prevent changes during verification. However, you can still update:

- ✅ **Scopes and their justifications** (most important!)
- ✅ **Terms of Service link** (if not already added)
- ✅ **Test users** (if in Testing mode)
- ✅ **Additional scopes** (if needed)

---

## 🎯 What You Need to Do

### Step 1: Navigate to Scopes Section

1. **In the OAuth Consent Screen page**, look for navigation tabs or sections at the top:
   - You should see tabs like: **"Branding"**, **"Scopes"**, **"Test users"**, **"Summary"**
   - Or look for a left sidebar with these options

2. **Click on "Scopes"** tab/section
   - This is where you can add scope justifications
   - This section is usually **NOT locked** even when branding is verified

---

### Step 2: Add Scope Justifications

In the **Scopes** section, you should see your scopes:
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly`

**For each scope:**

1. **Click on the scope** or look for an **"Edit"** or **"Justification"** button next to it
2. **Add justification text:**

**For `gmail.send`:**
```
JobSeeker is a job search platform. This scope is required to send personalized job 
application emails to recruiters on behalf of the user. Users compose emails in the app, 
and we send them via their connected Gmail account. We only send emails that users 
explicitly compose and approve in our platform - no automated or bulk sending.
```

**For `gmail.readonly`:**
```
JobSeeker is a job search platform. This scope is required to read recruiter replies 
to track email conversations. Users can see recruiter responses in their conversation 
inbox within the app. We only read emails that are replies to emails sent through our 
platform - we do not access any other Gmail data or personal emails.
```

3. **Save** the justification

---

### Step 3: Add Terms of Service Link

1. **Go back to "Branding" section** (if you can access it)
2. **Look for "Terms of Service link"** field
   - It might be below the Privacy Policy link
   - Or in a different section

3. **If you can't edit in Branding**, try:
   - **"App domain"** section
   - **"Additional information"** section
   - Or it might be in the **"Scopes"** section as additional information

4. **Add:** `https://startworking.in/terms-of-service`

---

### Step 4: Check "App domain" Section

1. **Look for "App domain"** or **"Authorized domains"** section
2. **Verify these are set:**
   - Application home page: `https://startworking.in/` ✅ (already set)
   - Application privacy policy link: `https://startworking.in/privacy-policy` ✅ (already set)
   - **Application terms of service link:** `https://startworking.in/terms-of-service` (add if missing)
   - Authorized domains: `startworking.in` (should be listed)

---

## 🔍 Finding the Scopes Section

### Method 1: Top Navigation Tabs

Look at the top of the OAuth Consent Screen page for tabs like:
```
[Branding] [Scopes] [Test users] [Summary]
```

Click on **"Scopes"**

### Method 2: Left Sidebar

Look for a left sidebar menu with:
- Branding
- Scopes
- Test users
- Summary

Click on **"Scopes"**

### Method 3: Direct URL

Try going directly to:
```
https://console.cloud.google.com/apis/credentials/consent?project=YOUR_PROJECT_ID
```

Then look for "Scopes" in the navigation

### Method 4: "ADD OR REMOVE SCOPES" Button

1. In the main OAuth Consent Screen page
2. Look for a button: **"ADD OR REMOVE SCOPES"** or **"MANAGE SCOPES"**
3. Click it - this will take you to the Scopes section

---

## 📝 What Information Goes Where

Since you can't edit the Branding section, here's where to put everything:

### ✅ Already Set (in Branding):
- App name: `JobSeeker` ✅
- User support email: `audicblocks@gmail.com` ✅
- Application home page: `https://startworking.in/` ✅
- Application privacy policy link: `https://startworking.in/privacy-policy` ✅

### ⚠️ Need to Add:

1. **Terms of Service link** - Try to find this field in:
   - App domain section
   - Additional information section
   - Or it might be in Scopes section

2. **App description/functionality** - Add in:
   - **Scope justifications** (this is the most important place!)
   - Each scope justification should explain what your app does

3. **Scope justifications** - Add in Scopes section:
   - This is where Google will understand your app functionality
   - This is MORE important than a separate app description field

---

## 🚀 Action Plan

1. **Find "Scopes" section** - Click on it in navigation
2. **Add justifications** for both `gmail.send` and `gmail.readonly` (see text above)
3. **Look for Terms of Service field** - In Scopes section or App domain section
4. **Save all changes**
5. **Submit for verification** (if not already submitted)

---

## 💡 Important Notes

### Why Scope Justifications Are Critical

Even if you can't add an "App description" field, the **scope justifications** serve the same purpose:
- They explain what your app does
- They explain why you need each scope
- Google reviewers read these to understand your app

### Terms of Service

If you **cannot find** a Terms of Service field:
- It might not be required (Privacy Policy is the main requirement)
- But if you see the field anywhere, add it: `https://startworking.in/terms-of-service`

### Verification Status

Since your branding is verified:
- You're making good progress! ✅
- The scope justifications are the next critical step
- Once you add scope justifications, you can proceed with CASA assessment

---

## 🔧 If You Still Can't Find Scopes Section

1. **Take a screenshot** of the entire OAuth Consent Screen page
2. **Look for any buttons** that say:
   - "Scopes"
   - "Manage scopes"
   - "Add or remove scopes"
   - "Edit scopes"
3. **Check the URL** - it might show which section you're in
4. **Try clicking** on different tabs/links in the navigation

---

## ✅ Minimum Requirements Checklist

Even with locked branding, make sure you have:

- [x] App name: `JobSeeker` ✅
- [x] User support email: `audicblocks@gmail.com` ✅
- [x] Application home page: `https://startworking.in/` ✅
- [x] Privacy Policy: `https://startworking.in/privacy-policy` ✅
- [ ] **Terms of Service:** `https://startworking.in/terms-of-service` (find and add)
- [ ] **Scope justification for `gmail.send`** (add in Scopes section)
- [ ] **Scope justification for `gmail.readonly`** (add in Scopes section)

---

## 🆘 Next Steps

1. **Click around** the OAuth Consent Screen page - look for "Scopes" tab/button
2. **Add scope justifications** - This is the most important thing right now
3. **Try to find Terms of Service field** - It might be in a different section
4. **Save everything**
5. **Proceed with CASA assessment** (check the verification status page)

The scope justifications are **more important** than a separate app description field, so focus on those first!

Good luck! 🚀

