/**
 * Razorpay Error Filter Utility
 * 
 * This utility suppresses expected Razorpay anti-fraud tracking errors from the console.
 * These errors are part of Razorpay's security system and do not affect payment functionality.
 * 
 * OPTIONAL: Only use this if you want cleaner console output during development.
 * 
 * Usage:
 * 1. Import in your main App.tsx or index.tsx:
 *    import { initRazorpayErrorFilter, cleanupRazorpayErrorFilter } from '@/utils/razorpayErrorFilter';
 * 
 * 2. Call initRazorpayErrorFilter() when app starts
 * 3. Call cleanupRazorpayErrorFilter() when app unmounts (if needed)
 */

let originalConsoleError: typeof console.error | null = null;

// List of error patterns to suppress (these are expected Razorpay errors)
const RAZORPAY_ERROR_PATTERNS = [
  'ERR_BLOCKED_BY_CLIENT',
  'ERR_CONNECTION_REFUSED',
  'lumberjack-metrics',
  'x-rtb-fingerprint',
  'data:;base64',
  'localhost:37857',
  'localhost:7070',
  'localhost:7071',
  '.razorpay.com',
];

/**
 * Check if error message matches any Razorpay error pattern
 */
function isRazorpayError(args: any[]): boolean {
  const message = args
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    .join(' ');
  
  return RAZORPAY_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Initialize the Razorpay error filter
 * Call this in your main App component or index.tsx
 */
export function initRazorpayErrorFilter() {
  if (originalConsoleError) {
    // Already initialized
    return;
  }

  // Store original console.error
  originalConsoleError = console.error;

  // Override console.error
  console.error = (...args: any[]) => {
    // Check if this is a Razorpay error
    if (isRazorpayError(args)) {
      // Optionally log a single summary message (uncomment if desired)
      // console.debug('[Razorpay Tracking]', 'Expected tracking request (suppressed)');
      return;
    }

    // Pass through all other errors
    if (originalConsoleError) {
      originalConsoleError.apply(console, args);
    }
  };

  console.log('[Razorpay Error Filter] Initialized - Razorpay tracking errors will be suppressed');
}

/**
 * Cleanup the error filter and restore original console.error
 * Call this when your app unmounts (usually not needed in React apps)
 */
export function cleanupRazorpayErrorFilter() {
  if (originalConsoleError) {
    console.error = originalConsoleError;
    originalConsoleError = null;
    console.log('[Razorpay Error Filter] Cleaned up - Original console.error restored');
  }
}

/**
 * Temporarily disable the filter (for debugging)
 */
export function pauseRazorpayErrorFilter() {
  if (originalConsoleError) {
    console.error = originalConsoleError;
  }
}

/**
 * Re-enable the filter after pausing
 */
export function resumeRazorpayErrorFilter() {
  if (originalConsoleError) {
    initRazorpayErrorFilter();
  }
}

// Export default for convenience
export default {
  init: initRazorpayErrorFilter,
  cleanup: cleanupRazorpayErrorFilter,
  pause: pauseRazorpayErrorFilter,
  resume: resumeRazorpayErrorFilter,
};
