import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/**
 * Allows: service role bearer, x-cron-secret (NAUKRI_SYNC_CRON_SECRET), or the same admins
 * as the app (user_roles.admin, profiles.superadmin, or public.is_superadmin() for JWT metadata).
 */
export async function isAuthorizedAdminRequest(
  req: Request,
  serviceSupabase: SupabaseClient,
): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token && serviceKey && token === serviceKey) {
    return true;
  }

  const cronSecret = Deno.env.get("NAUKRI_SYNC_CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    return true;
  }

  if (!token) return false;

  const { data: { user }, error } = await serviceSupabase.auth.getUser(token);
  if (error || !user) return false;

  const [{ data: roleData }, { data: profileData }] = await Promise.all([
    serviceSupabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin")
      .maybeSingle(),
    serviceSupabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!!roleData || profileData?.role === "superadmin") return true;

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!anonKey || !supabaseUrl) return false;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: isAdminRpc, error: rpcErr } = await userClient.rpc("is_superadmin");
  if (rpcErr) {
    console.warn("is_superadmin rpc:", rpcErr.message);
    return false;
  }
  return isAdminRpc === true;
}
