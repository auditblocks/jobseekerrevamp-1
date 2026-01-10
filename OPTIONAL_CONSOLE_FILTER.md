# Optional: Razorpay Console Error Filter

## What is this?

A utility to hide expected Razorpay tracking/fingerprinting errors from your browser console during development and production.

## Should you use it?

**Pros:**
- ✅ Cleaner console output
- ✅ Easier to spot real errors
- ✅ Less visual noise during development
- ✅ No impact on payment functionality

**Cons:**
- ⚠️ Overrides console.error (could hide other errors if filter is too broad)
- ⚠️ Adds a tiny bit of runtime overhead (negligible)
- ⚠️ Not strictly necessary (the errors are harmless)

**Recommendation:** Only use if the console errors are bothering you or making debugging difficult.

## How to Use

### Option 1: Global Filter (Recommended)

Add to your `src/main.tsx` or `src/index.tsx`:

```typescript
import { initRazorpayErrorFilter } from '@/utils/razorpayErrorFilter';

// Initialize the filter when app starts
if (import.meta.env.PROD || import.meta.env.DEV) {
  initRazorpayErrorFilter();
}

// ... rest of your app initialization
```

### Option 2: Only in Production

```typescript
import { initRazorpayErrorFilter } from '@/utils/razorpayErrorFilter';

// Only suppress in production (keep errors visible in development)
if (import.meta.env.PROD) {
  initRazorpayErrorFilter();
}
```

### Option 3: Only on Subscription Page

Add to `src/pages/Subscription.tsx`:

```typescript
import { useEffect } from 'react';
import { initRazorpayErrorFilter, cleanupRazorpayErrorFilter } from '@/utils/razorpayErrorFilter';

const Subscription = () => {
  // Enable filter when component mounts
  useEffect(() => {
    initRazorpayErrorFilter();
    
    return () => {
      cleanupRazorpayErrorFilter();
    };
  }, []);

  // ... rest of component
};
```

## Testing

### Before Filter
```
Console output:
❌ data:;base64,=:1 Failed to load resource: net::ERR_INVALID_URL
❌ localhost:37857/1234567.png Failed to load resource: net::ERR_CONNECTION_REFUSED
❌ localhost:7070/7654321.png Failed to load resource: net::ERR_CONNECTION_REFUSED
❌ lumberjack-metrics.razorpay.com Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
✅ Payment successful, verifying...
✅ Verification response: {success: true}
```

### After Filter
```
Console output:
ℹ️ [Razorpay Error Filter] Initialized
✅ Payment successful, verifying...
✅ Verification response: {success: true}
```

Much cleaner! 🎉

## Debugging

If you need to temporarily see Razorpay errors again (for debugging):

```typescript
import razorpayFilter from '@/utils/razorpayErrorFilter';

// Pause the filter
razorpayFilter.pause();

// ... do your testing ...

// Resume the filter
razorpayFilter.resume();
```

## Alternative: Chrome DevTools Filters

Instead of using this utility, you can filter errors directly in Chrome DevTools:

1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Click the filter icon (funnel)
4. Add negative filters:
   - `-ERR_BLOCKED_BY_CLIENT`
   - `-ERR_CONNECTION_REFUSED`
   - `-localhost:37857`
   - `-localhost:7070`
   - `-localhost:7071`
   - `-razorpay`

This achieves the same result without modifying your code!

## Summary

This utility is **completely optional**. The payment flow works perfectly fine with or without it. Only use it if you want cleaner console output.

The actual payment flow fixes are in `src/pages/Subscription.tsx` and work regardless of whether you use this filter.
