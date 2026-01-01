# Google Search Console DNS Verification (Netlify)

## Problem
When using Netlify DNS (nameservers pointing to Netlify), you cannot add DNS records in Hostinger. You must add them in Netlify instead.

## Solution: Add TXT Record in Netlify

### Step-by-Step Instructions

1. **Log in to Netlify**
   - Go to https://app.netlify.com/
   - Log in with your Netlify account

2. **Navigate to Your Site**
   - Click on your site (the one using `startworking.in`)
   - Or go to: Site settings → Domain management

3. **Access DNS Settings**
   - In the left sidebar, click **"Domain management"** or **"DNS"**
   - Or go to: Site settings → Domain management → DNS

4. **Add TXT Record**
   - Click **"Add DNS record"** or **"Add record"**
   - Select **TXT** as the record type
   - Enter the following:
     - **Name/Host:** `@` (or leave blank for root domain)
     - **TTL:** `3600` (or default)
     - **Value/Content:** `google-site-verification=rc6-O8O6pEHfuAXNleghnCOjr8Km32c8qB-oKBNioQs`
   - Click **"Save"** or **"Add record"**

5. **Wait for DNS Propagation**
   - DNS changes usually propagate within 10-30 minutes
   - Can take up to 48 hours in rare cases

6. **Verify in Google Search Console**
   - Go back to Google Search Console
   - Click **"Verify"**
   - Google will check for the TXT record

## Alternative: Use HTML Meta Tag Method

If you prefer not to add DNS records, you can use the HTML meta tag method instead:

1. The meta tag is already added to `index.html`:
   ```html
   <meta name="google-site-verification" content="google97c87009462fb73f" />
   ```

2. In Google Search Console, choose **"HTML tag"** verification method instead of DNS

3. Google will automatically detect the meta tag on your homepage

## Notes

- **DNS Method (TXT Record):** Verifies the entire domain including all subdomains
- **HTML Meta Tag Method:** Verifies only the specific property (e.g., https://startworking.in)
- Both methods work, but DNS method is more comprehensive

## Troubleshooting

If verification fails:
1. Wait 10-30 minutes for DNS propagation
2. Check that the TXT record appears in Netlify DNS settings
3. Verify the exact value matches (no extra spaces or quotes)
4. Try the HTML meta tag method as an alternative

