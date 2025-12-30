# Bulk Recruiter Import from Google Sheets

## Overview

The bulk import feature allows admins to import multiple recruiters from a Google Sheets spreadsheet in one operation.

## Components

### 1. Edge Function: `bulk-import-recruiters`

**Location**: `supabase/functions/bulk-import-recruiters/index.ts`

**Functionality**:
- Accepts `sheet_url` and `skip_duplicates` parameters
- Extracts sheet ID from Google Sheets URL
- Fetches CSV export from Google Sheets
- Parses CSV with proper quote handling
- Maps columns: `name`, `email` (required), `company`, `domain`, `tier`, `quality_score` (optional)
- Validates emails and normalizes tiers to FREE/PRO/PRO_MAX
- Supports skip duplicates or upsert mode
- Requires admin authentication via `is_superadmin()` RPC

**Deploy**:
```bash
supabase functions deploy bulk-import-recruiters
```

### 2. UI: Admin Recruiters Page

**Location**: `src/pages/admin/AdminRecruiters.tsx`

**Features**:
- "Bulk Import" button next to "Add Recruiter"
- Dialog with:
  - Google Sheet URL input
  - Skip duplicates toggle (Switch component)
  - Column documentation (required/optional)
  - Import button with loading state

## Google Sheets Format

### Required Columns

- **name** - Recruiter name (required)
- **email** - Email address (required, must be unique)

### Optional Columns

- **company** - Company name
- **domain** - Job domain
- **tier** - Subscription tier: FREE, PRO, or PRO_MAX (defaults to FREE if invalid)
- **quality_score** - Number between 0-100

### Example Sheet

| name | email | company | domain | tier | quality_score |
|------|-------|---------|--------|------|---------------|
| John Doe | john@company.com | Tech Corp | Software | PRO | 85 |
| Jane Smith | jane@startup.io | Startup Inc | Marketing | PRO_MAX | 92 |

## Usage

### 1. Prepare Google Sheet

1. Create a Google Sheet with the required columns
2. Make sure the sheet is publicly accessible or shared with view permissions
3. Copy the sheet URL (format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`)

### 2. Import via Admin UI

1. Go to **Admin** → **Recruiters**
2. Click **"Bulk Import"** button
3. Paste the Google Sheets URL
4. Toggle **"Skip Duplicates"** if you want to skip existing emails
5. Click **"Import Recruiters"**
6. Wait for import to complete
7. Review the success message with import statistics

### 3. Import via API

```bash
curl -X POST \
  https://ypmyzbtgossmizklszek.supabase.co/functions/v1/bulk-import-recruiters \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sheet_url": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit",
    "skip_duplicates": true
  }'
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Import completed: 50 inserted, 5 skipped",
  "stats": {
    "total_rows": 55,
    "valid_recruiters": 55,
    "inserted": 50,
    "skipped": 5,
    "errors": 0
  }
}
```

### Error Response

```json
{
  "error": "Invalid Google Sheets URL format",
  "details": "..."
}
```

## Validation Rules

1. **Email Validation**:
   - Must be valid email format
   - Must be unique (if `skip_duplicates` is false, will error on duplicate)

2. **Tier Validation**:
   - Must be one of: FREE, PRO, PRO_MAX
   - Case-insensitive
   - Defaults to FREE if invalid

3. **Quality Score Validation**:
   - Must be a number between 0-100
   - Ignored if invalid

4. **Name Validation**:
   - Required field
   - Cannot be empty

## Error Handling

The import process handles errors gracefully:

- **Invalid emails**: Skipped with error message
- **Missing required fields**: Skipped with error message
- **Duplicate emails** (if `skip_duplicates: true`): Skipped silently
- **Duplicate emails** (if `skip_duplicates: false`): Error returned
- **Invalid tier values**: Defaults to FREE
- **Invalid quality_score**: Ignored

All errors are reported in the response `errors` array.

## Security

- **Admin Only**: Requires `is_superadmin()` RPC check
- **Authentication**: Requires valid JWT token
- **Authorization**: Verifies user is superadmin before processing

## Configuration

The edge function is configured in `supabase/config.toml`:

```toml
[functions.bulk-import-recruiters]
verify_jwt = false
```

Note: `verify_jwt = false` allows the function to handle authentication manually via the `is_superadmin()` RPC check.

## Troubleshooting

### "Invalid Google Sheets URL format"
- Ensure URL is in format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
- Check that sheet ID is present in URL

### "Failed to fetch sheet"
- Verify sheet is publicly accessible
- Check sheet sharing settings (should be "Anyone with the link can view")
- Verify sheet URL is correct

### "Forbidden: Admin access required"
- Verify user has superadmin role
- Check `is_superadmin()` RPC function is working
- Verify JWT token is valid

### "Sheet is empty or has no data rows"
- Ensure sheet has at least a header row and one data row
- Check that sheet is not empty

### Import succeeds but no recruiters added
- Check for errors in response
- Verify email addresses are valid
- Check if duplicates were skipped (if `skip_duplicates: true`)
- Review import statistics in response

## Testing

### Test with Sample Sheet

1. Create a test Google Sheet with sample data
2. Make it publicly accessible
3. Use the Bulk Import feature in Admin UI
4. Verify recruiters are added to database
5. Check import statistics match expectations

### Test Error Handling

1. Test with invalid email formats
2. Test with missing required fields
3. Test with duplicate emails
4. Test with invalid tier values
5. Verify all errors are reported correctly

