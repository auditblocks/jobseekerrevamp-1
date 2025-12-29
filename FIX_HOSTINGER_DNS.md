# Fix: Domain Showing Hostinger Parking Page

## Problem
Your domain `startworking.in` is showing Hostinger's parking page instead of your Netlify site. This means the domain is still pointing to Hostinger's servers.

## Root Cause
The domain nameservers are still pointing to Hostinger instead of Netlify, OR the DNS records aren't correctly configured.

---

## Solution: Configure DNS Correctly

You have **two options**:

### Option 1: Use Netlify Nameservers (Recommended - Easiest)

This is the easiest method. You change the nameservers in Hostinger to point to Netlify.

#### Step 1: Get Netlify Nameservers
1. Go to **Netlify Dashboard**: https://app.netlify.com/
2. Select your site
3. Go to **Domain settings**
4. Click on **"Use Netlify DNS"** or find the nameservers
5. You'll see nameservers like:
   - `dns1.p01.nsone.net`
   - `dns2.p01.nsone.net`
   - `dns3.p01.nsone.net`
   - `dns4.p01.nsone.net`

   (These are examples - your actual nameservers will be different)

#### Step 2: Update Nameservers in Hostinger
1. Go to **Hostinger**: https://hpanel.hostinger.com/
2. Find your domain: `startworking.in`
3. Go to **DNS / Nameservers** section
4. Click **"Change"** or **"Edit"** nameservers
5. Select **"Custom nameservers"**
6. Enter the 4 Netlify nameservers you got from Step 1
7. Click **"Save"** or **"Update"**

#### Step 3: Wait for Propagation
- DNS changes can take **24-48 hours** to propagate
- Usually works within **1-2 hours**
- Check status: https://www.whatsmydns.net/#NS/startworking.in

---

### Option 2: Use DNS Records (Alternative)

If you want to keep Hostinger nameservers, you need to add specific DNS records.

#### Step 1: Get DNS Records from Netlify
1. Go to **Netlify Dashboard** → Your Site → **Domain settings**
2. Click on `startworking.in`
3. You'll see DNS records needed, something like:
   - **A Record**: `@` → `75.2.60.5` (example IP)
   - **CNAME Record**: `www` → `your-site.netlify.app`

#### Step 2: Add DNS Records in Hostinger
1. Go to **Hostinger** → Your domain → **DNS Zone Editor**
2. **Remove any existing A records** for `@` or root domain
3. **Add A Record**:
   - **Name**: `@` (or leave blank for root)
   - **Type**: `A`
   - **Value**: (IP from Netlify - usually `75.2.60.5` or similar)
   - **TTL**: `3600` (or default)
4. **Add CNAME Record** (optional, for www):
   - **Name**: `www`
   - **Type**: `CNAME`
   - **Value**: `your-site.netlify.app`
   - **TTL**: `3600`

#### Step 3: Remove Parking Page
1. In Hostinger, look for **"Parked Domain"** or **"Domain Parking"** settings
2. **Disable** or **Remove** the parking page
3. Make sure the domain is **active** and not parked

---

## Quick Checklist

### If Using Netlify Nameservers:
- [ ] Got 4 nameservers from Netlify Dashboard
- [ ] Updated nameservers in Hostinger
- [ ] Selected "Custom nameservers" in Hostinger
- [ ] Saved changes
- [ ] Waiting for DNS propagation (1-48 hours)

### If Using DNS Records:
- [ ] Got A record IP from Netlify
- [ ] Removed old A records in Hostinger
- [ ] Added new A record pointing to Netlify IP
- [ ] Disabled parking page in Hostinger
- [ ] Waiting for DNS propagation (1-48 hours)

---

## Verify DNS Configuration

### Check Nameservers:
```bash
dig NS startworking.in +short
```
Should show Netlify nameservers (if using Option 1)

### Check A Records:
```bash
dig startworking.in +short
```
Should show Netlify IP addresses

### Online Tools:
- https://www.whatsmydns.net/#A/startworking.in
- https://dnschecker.org/#A/startworking.in

---

## Common Issues

### Issue 1: Still Showing Parking Page After 24 Hours
**Fix**: 
- Double-check nameservers are correct
- Make sure parking page is disabled in Hostinger
- Clear browser cache
- Try different DNS server: `8.8.8.8` (Google DNS)

### Issue 2: Nameservers Not Updating
**Fix**:
- Wait longer (can take up to 48 hours)
- Verify nameservers are saved correctly in Hostinger
- Check Hostinger support if nameservers won't update

### Issue 3: DNS Records Not Working
**Fix**:
- Remove ALL old A records first
- Add only the Netlify A record
- Make sure TTL is set correctly
- Verify IP address is correct from Netlify

### Issue 4: Domain Still Points to Hostinger
**Fix**:
- Check if domain is "parked" in Hostinger settings
- Disable domain parking
- Make sure domain status is "Active"
- Remove any Hostinger hosting assignments

---

## Step-by-Step: Hostinger Nameserver Change

1. **Login to Hostinger**: https://hpanel.hostinger.com/
2. **Go to Domains**: Click on "Domains" in sidebar
3. **Select Domain**: Click on `startworking.in`
4. **DNS Settings**: Find "Nameservers" or "DNS" section
5. **Change Nameservers**: 
   - Click "Change" or "Edit"
   - Select "Custom nameservers"
   - Enter Netlify nameservers (4 of them)
6. **Save**: Click "Save" or "Update"
7. **Wait**: 1-48 hours for propagation

---

## After Fixing

Once DNS is correctly configured:
1. ✅ Domain will point to Netlify
2. ✅ Parking page will disappear
3. ✅ Your site will load at https://startworking.in
4. ✅ SSL certificate will auto-provision (24-48 hours)

---

## Need Help?

If still not working after 48 hours:
1. **Check Netlify Dashboard** → Domain settings for exact DNS values
2. **Contact Hostinger Support** if nameservers won't update
3. **Contact Netlify Support** if DNS is correct but site not loading

---

## Summary

**The issue**: Domain nameservers/DNS records are pointing to Hostinger instead of Netlify.

**The fix**: 
- **Option 1**: Change nameservers to Netlify (easiest)
- **Option 2**: Add Netlify DNS records in Hostinger

**Time**: 1-48 hours for DNS propagation

