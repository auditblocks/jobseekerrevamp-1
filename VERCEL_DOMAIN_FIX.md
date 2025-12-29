# Fixing "Invalid Configuration" for startworking.in

## Current Issue
Vercel shows "Invalid Configuration" because there's a conflicting DNS record.

## What Vercel Needs

### ❌ REMOVE This Record (Conflicting):
```
Type: A
Name: @
Value: 84.32.84.32
```

### ✅ ADD This Record (Correct):
```
Type: A
Name: @
Value: 216.198.79.1
```

---

## Step-by-Step Fix in Hostinger

### 1. Log in to Hostinger
- Go to: https://hpanel.hostinger.com/
- Log in with your credentials

### 2. Navigate to DNS Settings
1. Click **"Domains"** in the left sidebar
2. Click **"Manage"** next to `startworking.in`
3. Click on the **"DNS / Nameservers"** tab
4. Click **"Manage DNS Records"** or look for DNS records section

### 3. Remove the Conflicting Record
1. **Find the A record** with:
   - Type: `A`
   - Name: `@` (or blank, or `startworking.in`)
   - Value: `84.32.84.32`
2. **Click the delete/trash icon** next to it
3. **Confirm deletion**

### 4. Add the Correct Record
1. Click **"Add Record"** or **"Create Record"**
2. Fill in:
   - **Type**: Select `A`
   - **Name**: Enter `@` (or leave blank if Hostinger uses @ for root)
   - **Points to** / **Value**: `216.198.79.1`
   - **TTL**: `3600` (or leave default)
3. Click **"Add Record"** or **"Save"**

### 5. Verify All Records
Your DNS records should now have:
- ✅ One A record: `@` → `216.198.79.1`
- ❌ NO A record pointing to `84.32.84.32`

---

## After Making Changes

### Wait for DNS Propagation
- **Minimum**: 15-30 minutes
- **Usually**: 1-2 hours
- **Maximum**: 48 hours

### Check in Vercel
1. Go to Vercel Dashboard
2. Your Project → Settings → Domains
3. Click **"Refresh"** button
4. Status should change from "Invalid Configuration" to "Valid Configuration"

### Verify DNS Propagation
Use a DNS checker to see if the change has propagated:
- https://dnschecker.org/
- Enter: `startworking.in`
- Select: `A` record type
- Check if it shows `216.198.79.1` globally

---

## Troubleshooting

### Still Showing "Invalid Configuration" After 2 Hours

1. **Double-check Hostinger DNS**:
   - Make sure the old record (`84.32.84.32`) is completely removed
   - Make sure the new record (`216.198.79.1`) is added correctly
   - Check for typos in the IP address

2. **Check for Multiple A Records**:
   - You should only have ONE A record for `@`
   - Remove any duplicate A records

3. **Clear DNS Cache**:
   - On your computer: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
   - Or use a different network/device

4. **Verify in DNS Checker**:
   - Go to https://dnschecker.org/
   - Check if `startworking.in` shows `216.198.79.1` globally
   - If not, DNS hasn't propagated yet - wait longer

### Hostinger Interface Looks Different

If Hostinger's interface is different:
- Look for "DNS Zone Editor" or "DNS Management"
- The A record might be called "Points to" instead of "Value"
- `@` might need to be entered as your domain name or left blank

### Need to Add www Subdomain

If you also want `www.startworking.in` to work:
1. In Hostinger, add a CNAME record:
   - Type: `CNAME`
   - Name: `www`
   - Points to: `cname.vercel-dns.com`
2. In Vercel, also add `www.startworking.in` as a domain

---

## Quick Checklist

- [ ] Logged into Hostinger
- [ ] Found DNS / Nameservers section
- [ ] Removed A record: `@` → `84.32.84.32`
- [ ] Added A record: `@` → `216.198.79.1`
- [ ] Saved changes
- [ ] Waited 15-30 minutes
- [ ] Clicked "Refresh" in Vercel
- [ ] Status changed to "Valid Configuration"

---

## Still Need Help?

1. **Screenshot your Hostinger DNS records** and verify:
   - Only one A record for `@`
   - It points to `216.198.79.1`
   - No record pointing to `84.32.84.32`

2. **Check Vercel again** after waiting:
   - Click "Refresh" button
   - Check if error message changed

3. **Contact Support**:
   - Vercel Support: https://vercel.com/support
   - Hostinger Support: https://www.hostinger.com/contact

