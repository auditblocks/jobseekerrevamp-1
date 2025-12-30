# How to Update OAuth Consent Screen - Step by Step Guide

## 🎯 Finding the App Description Field

The OAuth Consent Screen interface can be confusing. Here's exactly where to find each field:

---

## Step-by-Step Navigation

### Step 1: Access OAuth Consent Screen

1. Go to: [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you've selected the **correct project** (top dropdown)
3. Navigate to: **APIs & Services** → **OAuth consent screen**
   - Or go directly: [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)

---

### Step 2: Edit the App

1. You should see your OAuth consent screen configuration
2. Look for one of these buttons:
   - **"EDIT APP"** button (usually at the top right)
   - **"CONFIGURE CONSENT SCREEN"** button
   - A pencil/edit icon
3. Click it to enter edit mode

---

### Step 3: Navigate Through the Setup Steps

The OAuth consent screen setup has **multiple steps/pages**. You need to go through each one:

#### **Step 3.1: App Information (First Page)**

This is where you'll find most fields:

1. **User type** - Select "External" (unless you're using Google Workspace)
2. **App name** - Enter: `JobSeeker` or `Startworking`
3. **User support email** - Select your email from dropdown or add new
4. **App logo** - Upload your logo (optional)
5. **Application home page** - Enter: `https://startworking.in`
6. **App domain** - Enter: `startworking.in`
7. **Authorized domains** - Click "ADD DOMAIN" and enter: `startworking.in`
8. **Developer contact information** - Enter your email

**⚠️ Note:** The "App description" field might be on a **different step/page**, not on the first page!

#### **Step 3.2: Scopes (Second Page)**

1. Click **"ADD OR REMOVE SCOPES"**
2. You should see your scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
3. For each scope, you can add a **justification** (this is different from app description)

#### **Step 3.3: Test Users (Third Page - Optional)**

- Add test users if your app is in "Testing" mode
- Skip if you're submitting for verification

#### **Step 3.4: Summary (Last Page)**

- Review all settings
- Click **"BACK TO DASHBOARD"** or **"SAVE AND CONTINUE"**

---

## 🔍 Where is "App Description"?

The "App description" field location depends on your Google Cloud Console version:

### **Option A: In App Information Section**

1. On the **App Information** page (first step)
2. Scroll down past the basic fields
3. Look for a field labeled:
   - **"App description"**
   - **"Application description"**
   - **"Description"**
   - **"What does your app do?"**

### **Option B: In Additional Information Section**

1. Still on the **App Information** page
2. Look for a section called:
   - **"Additional information"**
   - **"App details"**
   - **"More information"**
3. Expand this section
4. The description field should be there

### **Option C: In Scope Justification**

Sometimes Google combines app description with scope justification:

1. Go to the **Scopes** step/page
2. Look for a field at the top that says:
   - **"How does your app use the data it accesses?"**
   - **"App functionality description"**
3. This is where you describe what your app does

---

## 📝 What to Enter in App Description

If you find the field, enter:

```
JobSeeker is a job search platform that helps job seekers connect with recruiters. 
Users connect their Gmail account to send personalized emails to recruiters and track 
recruiter replies in their conversation inbox. Gmail access is only used for sending 
job application emails and reading recruiter replies - no other Gmail data is accessed.
```

---

## 🎯 Alternative: Use Scope Justifications

If you **cannot find** the "App description" field, you can describe your app in the **scope justifications** instead:

### For `gmail.send` scope:
```
JobSeeker is a job search platform. This scope is required to send personalized job 
application emails to recruiters on behalf of the user. Users compose emails in the app, 
and we send them via their connected Gmail account. We only send emails that users 
explicitly compose and approve in our platform.
```

### For `gmail.readonly` scope:
```
JobSeeker is a job search platform. This scope is required to read recruiter replies 
to track email conversations. Users can see recruiter responses in their conversation 
inbox within the app. We only read emails that are replies to emails sent through our 
platform - we do not access any other Gmail data.
```

---

## 🔧 Troubleshooting

### Problem: "I don't see an EDIT button"

**Solution:**
- Make sure you're the **owner** or have **Editor** role on the project
- Try refreshing the page
- Check if you're in the correct Google Cloud project

### Problem: "I see the form but no description field"

**Solution:**
- The description might be in scope justifications instead
- Try scrolling down - it might be below the fold
- Check if there's a "More options" or "Advanced" section to expand

### Problem: "I can't save changes"

**Solution:**
- Make sure all required fields are filled (marked with *)
- Check if you have the necessary permissions
- Try saving each step separately

---

## ✅ Minimum Required Fields

Even without the description field, make sure you have:

- [x] **App name** - `JobSeeker` or `Startworking`
- [x] **User support email** - Your support email
- [x] **Application home page** - `https://startworking.in`
- [x] **Privacy Policy link** - `https://startworking.in/privacy-policy`
- [x] **Terms of Service link** - `https://startworking.in/terms-of-service`
- [x] **Authorized domains** - `startworking.in`
- [x] **Scope justifications** - For both `gmail.send` and `gmail.readonly`

---

## 📸 What You Should See

When you click "EDIT APP", you should see a form with sections like:

```
┌─────────────────────────────────────┐
│ OAuth consent screen                │
│                                     │
│ [EDIT APP] button                   │
│                                     │
│ User type: [External ▼]            │
│ App name: [_____________]           │
│ User support email: [_____________]  │
│ Application home page: [________]   │
│ App domain: [_____________]         │
│ Authorized domains: [_____________] │
│                                     │
│ [App description field - if exists] │
│                                     │
│ Privacy Policy: [_____________]     │
│ Terms of Service: [_____________]  │
│                                     │
│ [SAVE AND CONTINUE]                 │
└─────────────────────────────────────┘
```

---

## 🚀 Quick Action Plan

1. **Go to:** [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. **Click:** "EDIT APP" or "CONFIGURE CONSENT SCREEN"
3. **Fill all required fields** (marked with *)
4. **Add Privacy Policy:** `https://startworking.in/privacy-policy`
5. **Add Terms of Service:** `https://startworking.in/terms-of-service`
6. **Look for description field** - if not found, use scope justifications instead
7. **Go to Scopes step** - Add justifications for both scopes
8. **Save and continue**

---

## 💡 Pro Tip

If you **still can't find** the description field:
- It's okay! Google will understand your app from:
  - The scope justifications
  - The Privacy Policy (which describes Gmail usage)
  - The app name and home page
- Focus on completing the **scope justifications** - that's more important!

---

## Need More Help?

1. **Take a screenshot** of what you see in OAuth consent screen
2. **Describe** which step/page you're on
3. **List** the fields you can see
4. I can provide more specific guidance based on your exact interface

Good luck! 🚀

