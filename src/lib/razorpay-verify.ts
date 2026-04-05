/** Normalize Razorpay checkout `handler` payload (field names vary by integration / SDK). */
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

/** Read `{ error: string }` from Supabase functions.invoke error body when present. */
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
