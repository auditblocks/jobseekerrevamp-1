/**
 * @fileoverview Retry wrapper for Supabase Edge Function invocations.
 * Retries only transient-looking failures (network errors or 5xx responses) —
 * never 4xx, since resending a request the server already rejected as invalid
 * wastes an attempt and can't succeed.
 */

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof FunctionsHttpError) {
    const status = (error.context as Response | undefined)?.status;
    return typeof status === "number" ? status >= 500 : true;
  }
  // FunctionsFetchError / FunctionsRelayError / unknown network errors are transient
  return true;
}

/**
 * Invokes a Supabase Edge Function, retrying transient failures with
 * exponential backoff. Returns the same `{ data, error }` shape as
 * `supabase.functions.invoke`, so call sites need minimal changes.
 */
export async function invokeEdgeFunctionWithRetry<T = any>(
  functionName: string,
  options: { body?: Record<string, unknown> },
  config: { retries?: number; baseDelayMs?: number } = {}
): Promise<{ data: T | null; error: any }> {
  const { retries = 2, baseDelayMs = 500 } = config;

  let lastResult: { data: T | null; error: any } = { data: null, error: null };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await supabase.functions.invoke<T>(functionName, options);
    lastResult = result;

    if (!result.error) return result;
    if (attempt === retries || !isRetryable(result.error)) return result;

    await sleep(baseDelayMs * Math.pow(2, attempt));
  }

  return lastResult;
}
