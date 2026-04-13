/**
 * @file razorpay-verify.ts
 * Utilities for normalizing and parsing Razorpay payment responses before
 * server-side signature verification.
 */

/**
 * Normalize Razorpay checkout `handler` payload (field names vary by integration / SDK).
 * Produces a consistent `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` shape.
 * @param response - Raw response object from the Razorpay checkout handler callback.
 */
export function normalizeRazorpayHandlerResponse(response: Record<string, unknown> | undefined | null) {
  const r = response && typeof response === "object" ? response : {};
  const order =
    (typeof r.razorpay_order_id === "string" && r.razorpay_order_id) ||
    (typeof r.order_id === "string" && r.order_id) ||
    "";
  const payment =
    (typeof r.razorpay_payment_id === "string" && r.razorpay_payment_id) ||
    (typeof r.payment_id === "string" && r.payment_id) ||
    "";
  const signature =
    (typeof r.razorpay_signature === "string" && r.razorpay_signature) ||
    (typeof r.signature === "string" && r.signature) ||
    "";
  return {
    razorpay_order_id: order.trim(),
    razorpay_payment_id: payment.trim(),
    razorpay_signature: signature.trim(),
  };
}

/**
 * Extracts a meaningful error message from a Supabase `functions.invoke` error.
 * The error's `context.body` may contain a JSON `{ error: string }` payload from the
 * edge function; this parser surfaces that inner message when available.
 */
export function parseSupabaseFunctionInvokeError(error: {
  message: string;
  context?: { body?: string };
}): string {
  const raw = error.context?.body;
  let msg = error.message;
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
  }
  return msg;
}
