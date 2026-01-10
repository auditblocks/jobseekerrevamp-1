# Payment Flow Testing Checklist

## Pre-Testing Setup

✅ **Verify Razorpay Credentials**
- Check `RAZORPAY_KEY_ID` in environment variables
- Check `RAZORPAY_KEY_SECRET` in Supabase edge function secrets
- Ensure you're using test mode keys (starting with `rzp_test_`) for testing

✅ **Check Edge Function**
```bash
# Verify the verify-razorpay-payment function exists
ls -la supabase/functions/verify-razorpay-payment/
```

## Test Scenarios

### Scenario 1: Successful Payment ✅

**Steps:**
1. Navigate to `/subscription`
2. Click "Upgrade" on any paid plan
3. Enter test card details in Razorpay modal:
   - **Card Number:** `4111 1111 1111 1111`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVV:** Any 3 digits (e.g., `123`)
   - **Name:** Any name
4. Click "Pay"

**Expected Results:**
- ✅ Payment modal closes
- ✅ Console shows: `"Payment successful, verifying..."`
- ✅ Console shows: `"Verification response:"` with success data
- ✅ Toast appears: "Subscription upgraded successfully!"
- ✅ After 500ms, redirect to `/dashboard`
- ✅ Dashboard shows updated subscription tier

**Console Output:**
```javascript
Payment successful, verifying... {razorpay_order_id: "...", razorpay_payment_id: "...", razorpay_signature: "..."}
Verification response: {data: {...}, error: null}
```

---

### Scenario 2: Failed Payment ❌

**Steps:**
1. Navigate to `/subscription`
2. Click "Upgrade" on any paid plan
3. In Razorpay modal, use card that will fail:
   - **Card Number:** `4000 0000 0000 0002` (Razorpay test card that fails)
   - Or simply click the "X" to close modal

**Expected Results:**
- ✅ Payment modal closes or shows error
- ✅ Console shows: `"Payment failed:"` with error details
- ✅ Toast appears: "Payment failed: [error description]"
- ✅ Processing state clears (button becomes clickable again)
- ✅ User stays on subscription page

**Console Output:**
```javascript
Payment failed: {code: "...", description: "...", source: "...", step: "..."}
```

---

### Scenario 3: Verification Failure (Backend Error) ⚠️

**To Test:** Temporarily break the verification function or use invalid signature.

**Expected Results:**
- ✅ Console shows: `"Payment verification error:"`
- ✅ Toast appears: "Payment verification failed: [error message]"
- ✅ After 2 seconds, redirect to `/order-history`
- ✅ Order history shows the payment with status

**Console Output:**
```javascript
Payment verification error: Error: Invalid payment signature
```

---

### Scenario 4: User Cancels Payment ⛔

**Steps:**
1. Navigate to `/subscription`
2. Click "Upgrade" on any paid plan
3. Close the Razorpay modal (click X or press ESC)

**Expected Results:**
- ✅ Console shows: `"Payment modal dismissed by user"`
- ✅ Toast appears: "Payment cancelled"
- ✅ Processing state clears
- ✅ User stays on subscription page

**Console Output:**
```javascript
Payment modal dismissed by user
```

---

### Scenario 5: Network Error 🌐

**To Test:** Disconnect internet after opening payment modal.

**Expected Results:**
- ✅ Razorpay shows retry option
- ✅ User can retry up to 3 times
- ✅ Clear error message if all retries fail

---

## Razorpay Test Cards

Use these test cards in **test mode** (never use real cards in test mode):

### Successful Payments
- **Visa:** `4111 1111 1111 1111`
- **Mastercard:** `5555 5555 5555 4444`
- **Rupay:** `6521 5279 8759 2650`

### Failed Payments
- **Insufficient Funds:** `4000 0000 0000 0002`
- **Card Declined:** `4000 0000 0000 0069`
- **Network Error:** `4000 0000 0000 0119`

For all test cards:
- **CVV:** Any 3 digits
- **Expiry:** Any future date
- **Name:** Any name

## Console Errors to Ignore

These errors are **EXPECTED** and part of Razorpay's anti-fraud system:

```
❌ data:;base64,=:1 Failed to load resource: net::ERR_INVALID_URL
❌ localhost:37857/*.png Failed to load resource: net::ERR_CONNECTION_REFUSED
❌ localhost:7070/*.png Failed to load resource: net::ERR_CONNECTION_REFUSED
❌ localhost:7071/*.png Failed to load resource: net::ERR_CONNECTION_REFUSED
❌ lumberjack-metrics.razorpay.com Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
❌ Refused to get unsafe header "x-rtb-fingerprint-id"
```

👍 **These are NORMAL and don't affect payment!**

## What to Watch For

### Good Signs ✅
- Clear console logs showing payment progress
- Success toasts appear
- Navigation happens automatically
- Subscription tier updates in dashboard
- Order appears in order history

### Bad Signs ❌
- No console logs after payment
- Stuck on subscription page with no feedback
- Error toast with vague message
- No navigation after several seconds
- Subscription tier doesn't update

## Debugging Failed Tests

### If verification fails:
1. Check console for actual error message
2. Verify `verify-razorpay-payment` edge function is deployed
3. Check Supabase function logs
4. Verify Razorpay webhook signature is correct
5. Check environment variables

### If navigation doesn't happen:
1. Check console for "Payment successful, verifying..." message
2. Check if navigation is being blocked by browser
3. Verify `/dashboard` route exists and is accessible
4. Check for JavaScript errors in console (real ones, not Razorpay tracking errors)

### If payment modal doesn't open:
1. Check console for "Failed to load Razorpay SDK"
2. Verify internet connection
3. Check if Razorpay script loaded in Network tab
4. Verify Razorpay key ID is correct

## Post-Testing Verification

After successful payment:

1. ✅ Check **Razorpay Dashboard**:
   - Payment appears in test payments
   - Payment status is "captured"
   - Amount matches plan price

2. ✅ Check **Supabase**:
   - `subscription_history` table has new record
   - Record status is "completed"
   - `razorpay_payment_id` is populated

3. ✅ Check **User Profile**:
   - `subscription_tier` is updated
   - `subscription_expires_at` is set correctly

4. ✅ Check **Order History Page**:
   - Payment appears in list
   - Status shows as "Completed"
   - All details are correct

## Automated Testing (Optional)

If you want to add automated tests, test these functions:

```typescript
// Unit tests
describe('Subscription Payment Flow', () => {
  it('should handle successful payment', async () => {
    // Test handler with mock response
  });

  it('should handle payment failure', async () => {
    // Test error handler
  });

  it('should handle verification failure', async () => {
    // Test verification error recovery
  });

  it('should navigate to dashboard on success', async () => {
    // Test navigation logic
  });

  it('should navigate to order history on verification failure', async () => {
    // Test fallback navigation
  });
});
```

## Production Testing

Before deploying to production:

1. ✅ Switch to **production Razorpay keys**
2. ✅ Test with a small real payment (refund afterward)
3. ✅ Verify email receipts are sent
4. ✅ Test on multiple browsers (Chrome, Firefox, Safari)
5. ✅ Test on mobile devices
6. ✅ Monitor Supabase edge function logs
7. ✅ Set up error alerts for payment failures

## Summary

The payment flow has been significantly improved with:
- ✅ Better error handling
- ✅ Detailed logging
- ✅ Fallback navigation
- ✅ User feedback at every step
- ✅ Payment retry support
- ✅ Improved modal UX

All console errors you see from Razorpay tracking are **expected and harmless**!
