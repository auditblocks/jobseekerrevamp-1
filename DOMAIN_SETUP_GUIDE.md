# Connecting Hostinger Domain to Vercel

Complete step-by-step guide to connect your Hostinger domain to your Vercel deployment.

---

## Prerequisites

- Domain purchased from Hostinger
- Project deployed on Vercel
- Access to Hostinger hPanel
- Access to Vercel dashboard

---

## Method 1: Using Vercel's DNS (Recommended - Easier)

This method uses Vercel's nameservers, which is simpler and gives Vercel full control.

### Step 1: Add Domain in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**
3. **Go to Settings** → **Domains**
4. **Click "Add"** or **"Add Domain"**
5. **Enter your domain**:
   - For root domain: `yourdomain.com`
   - For www: `www.yourdomain.com`
   - Add both if you want both to work
6. **Click "Add"**

### Step 2: Get Vercel Nameservers

After adding the domain, Vercel will show you nameservers like:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Copy these nameservers** - you'll need them in the next step.

### Step 3: Update Nameservers in Hostinger

1. **Log in to Hostinger**: https://hpanel.hostinger.com/
2. **Go to Domains** → **Manage**
3. **Click on your domain**
4. **Go to "Nameservers"** tab
5. **Select "Custom Nameservers"**
6. **Enter the Vercel nameservers**:
   - Nameserver 1: `ns1.vercel-dns.com`
   - Nameserver 2: `ns2.vercel-dns.com`
7. **Click "Save"** or **"Update"**

### Step 4: Wait for DNS Propagation

- DNS changes can take **15 minutes to 48 hours** to propagate
- Usually takes **1-2 hours** in most cases
- You can check status in Vercel Dashboard → Domains

---

## Method 2: Using Hostinger DNS (Keep Hostinger DNS)

If you want to keep using Hostinger's DNS (for email, etc.), use this method.

### Step 1: Add Domain in Vercel

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Domains**
2. **Click "Add Domain"**
3. **Enter your domain**: `yourdomain.com`
4. **Click "Add"**

### Step 2: Get DNS Records from Vercel

After adding, Vercel will show you DNS records to add. They'll look like:

**For root domain (yourdomain.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Or Vercel might give you specific IP addresses** - use what Vercel shows you!

### Step 3: Add DNS Records in Hostinger

1. **Log in to Hostinger**: https://hpanel.hostinger.com/
2. **Go to Domains** → **Manage**
3. **Click on your domain**
4. **Go to "DNS / Nameservers"** tab
5. **Click "Manage DNS Records"** or **"Add Record"**

6. **Add A Record for root domain**:
   - **Type**: A
   - **Name**: `@` (or leave blank, or enter your domain)
   - **Points to**: `76.76.21.21` (use the IP Vercel gives you)
   - **TTL**: 3600 (or default)
   - **Click "Add Record"**

7. **Add CNAME Record for www**:
   - **Type**: CNAME
   - **Name**: `www`
   - **Points to**: `cname.vercel-dns.com` (use what Vercel shows)
   - **TTL**: 3600 (or default)
   - **Click "Add Record"**

### Step 4: Remove Conflicting Records

- **Remove any existing A records** pointing to other IPs for `@`
- **Remove any existing CNAME records** for `www` pointing elsewhere
- Keep your email MX records if you use Hostinger email

### Step 5: Wait for DNS Propagation

- Wait **15 minutes to 48 hours** for DNS to propagate
- Check status in Vercel Dashboard → Domains

---

## Verifying the Connection

### Check in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Domains**
2. You'll see the status:
   - ✅ **Valid Configuration** - Domain is connected
   - ⏳ **Pending** - Still propagating
   - ❌ **Invalid Configuration** - Check DNS records

### Test Your Domain

1. **Wait at least 15 minutes** after making changes
2. **Visit your domain**: `https://yourdomain.com`
3. **Visit www**: `https://www.yourdomain.com`
4. Both should show your Vercel site

---

## Troubleshooting

### Domain Not Working After 24 Hours

1. **Check DNS records are correct**:
   - Use a DNS checker: https://dnschecker.org/
   - Enter your domain and check if A/CNAME records are correct

2. **Verify in Vercel**:
   - Go to Domains → Check for error messages
   - Vercel will tell you what's wrong

3. **Clear DNS cache**:
   - On your computer: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
   - Or use a different network/device

### "Invalid Configuration" Error

1. **Double-check DNS records** match what Vercel shows
2. **Remove old/conflicting records**
3. **Wait a bit longer** - DNS can be slow

### www Not Working

1. **Make sure CNAME record is added** for `www`
2. **Check it points to** `cname.vercel-dns.com` (or what Vercel shows)
3. **Wait for propagation**

### SSL Certificate Issues

- Vercel automatically provisions SSL certificates
- This happens automatically after DNS is configured
- Can take a few minutes after DNS is verified

---

## Important Notes

### Email Configuration

If you use Hostinger email:
- **Method 1 (Vercel Nameservers)**: You'll need to configure email separately or use a service like Google Workspace
- **Method 2 (Hostinger DNS)**: Your email will continue working as long as you keep MX records

### Subdomains

To add subdomains (e.g., `app.yourdomain.com`):
1. Add in Vercel: Settings → Domains → Add `app.yourdomain.com`
2. Add CNAME record in Hostinger:
   - Type: CNAME
   - Name: `app`
   - Points to: `cname.vercel-dns.com`

### Redirects

Vercel automatically handles:
- `www` to root domain (or vice versa)
- HTTP to HTTPS
- Configure in `vercel.json` if needed

---

## Quick Checklist

- [ ] Domain added in Vercel Dashboard
- [ ] DNS records added in Hostinger (or nameservers updated)
- [ ] Removed conflicting DNS records
- [ ] Waited at least 15 minutes
- [ ] Checked domain status in Vercel
- [ ] Tested domain in browser
- [ ] SSL certificate is active (automatic)

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs/concepts/projects/domains
- **Hostinger Support**: https://www.hostinger.com/contact
- **DNS Checker**: https://dnschecker.org/

---

## Example: Complete Setup

**Domain**: `myjobseeker.com`

**In Vercel**:
1. Settings → Domains → Add `myjobseeker.com`
2. Add `www.myjobseeker.com`
3. Copy DNS records shown

**In Hostinger**:
1. Domains → Manage → DNS
2. Add A record: `@` → `76.76.21.21`
3. Add CNAME record: `www` → `cname.vercel-dns.com`

**Wait 1-2 hours**, then visit `https://myjobseeker.com` ✅

