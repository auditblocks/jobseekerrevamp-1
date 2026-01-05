# Resume Optimizer & ATS Score Checker Setup Guide

## Overview
The Resume Optimizer feature allows PRO and PRO_MAX users to upload resumes, get ATS compatibility scores, and receive AI-powered optimization suggestions using Google Gemini AI.

## Prerequisites

### 1. Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key for Gemini
3. Copy the API key

### 2. Supabase Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `resumes`
3. Set it to **Private** (not public)
4. Configure RLS policies (see below)

## Setup Instructions

### Step 1: Add Google Gemini API Key to Supabase Secrets

**Option 1: Using the Setup Script (Recommended)**
```bash
# Run the interactive setup script
./setup-gemini-api-key.sh
```

**Option 2: Using Supabase CLI Directly**
```bash
# Replace 'your_api_key_here' with your actual API key
supabase secrets set GOOGLE_GEMINI_API_KEY=your_api_key_here
```

**Option 3: Via Supabase Dashboard**
1. Go to Project Settings → Edge Functions → Secrets
2. Click "Add new secret"
3. Name: `GOOGLE_GEMINI_API_KEY`
4. Value: `your_api_key_here`
5. Click "Save"

**Note:** After setting the secret, you may need to redeploy your edge functions for the changes to take effect.

### Step 2: Create Supabase Storage Bucket

1. **Via Supabase Dashboard:**
   - Navigate to Storage
   - Click "New bucket"
   - Name: `resumes`
   - Public: **No** (Private)
   - File size limit: 5MB
   - Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`

2. **Configure RLS Policies for Storage:**

Run this SQL in Supabase SQL Editor:

```sql
-- Allow users to upload their own resumes
CREATE POLICY "Users can upload their own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own resumes
CREATE POLICY "Users can view their own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete their own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Run Database Migration

The migration file `supabase/migrations/20260103000000_resume_optimizer.sql` creates:
- `resumes` table
- `resume_analyses` table
- `resume_versions` table
- RLS policies
- Helper functions

Apply the migration:
```bash
supabase db push
```

Or via Supabase Dashboard → SQL Editor → Run the migration SQL.

### Step 4: Deploy Edge Functions

Deploy the edge functions:

```bash
# Deploy upload-resume function
supabase functions deploy upload-resume

# Deploy analyze-resume function
supabase functions deploy analyze-resume
```

### Step 5: Install Frontend Dependencies

```bash
npm install react-dropzone
```

### Step 6: Verify Configuration

1. Check `supabase/config.toml` has:
   ```toml
   [functions.upload-resume]
   verify_jwt = true

   [functions.analyze-resume]
   verify_jwt = true
   ```

2. Verify the route is added in `src/App.tsx`:
   ```tsx
   <Route path="/resume-optimizer" element={<ResumeOptimizer />} />
   ```

## Testing

1. **Test as PRO User:**
   - Sign in with a PRO or PRO_MAX account
   - Navigate to `/resume-optimizer`
   - Upload a test resume (PDF, DOCX, or TXT)
   - Run analysis

2. **Test as FREE User:**
   - Sign in with a FREE account
   - Navigate to `/resume-optimizer`
   - Should see upgrade prompt

## Features

- ✅ Resume upload (PDF, DOCX, TXT)
- ✅ Multiple resume management
- ✅ ATS compatibility scoring (1-100)
- ✅ AI-powered analysis with Google Gemini
- ✅ Keyword matching against job descriptions
- ✅ Optimization suggestions
- ✅ Resume version history
- ✅ PRO/PRO_MAX subscription gating

## Troubleshooting

### "Resume Optimizer is available for PRO and PRO_MAX subscribers only"
- Check user's `subscription_tier` in `profiles` table
- Ensure it's set to "PRO" or "PRO_MAX"

### "Google Gemini API key not configured"
- Verify `GOOGLE_GEMINI_API_KEY` is set in Supabase secrets
- Redeploy edge functions after adding secret

### "Failed to upload file"
- Check Supabase Storage bucket exists and is named `resumes`
- Verify RLS policies are configured
- Check file size (max 5MB)

### "Could not extract text from resume"
- For PDF and DOCX files, text extraction happens during analysis
- Ensure the file is not corrupted or password-protected
- Try uploading a TXT file to test

## API Usage

### Upload Resume
```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("name", "My Resume");
formData.append("setAsActive", "true");

const { data, error } = await supabase.functions.invoke("upload-resume", {
  body: formData,
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

### Analyze Resume
```typescript
const { data, error } = await supabase.functions.invoke("analyze-resume", {
  body: {
    resume_id: "resume-uuid",
    job_description: "Optional job description text",
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

## Notes

- Resume files are stored in Supabase Storage under `{user_id}/{timestamp}-{random}.{ext}`
- Text extraction for PDF/DOCX is basic - consider adding proper parsing libraries if needed
- Google Gemini API has rate limits - monitor usage
- Analysis results are stored in `resume_analyses` table for history

