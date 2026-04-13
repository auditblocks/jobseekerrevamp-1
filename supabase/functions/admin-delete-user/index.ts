/**
 * @module admin-delete-user
 * @description Supabase Edge Function that allows a **superadmin** to permanently
 * delete another user. The function performs a multi-layered authorization check
 * (user_roles table → profiles.role → auth metadata) before proceeding.
 *
 * Deletion strategy:
 *   - If the target exists in Supabase Auth → call the Auth Admin DELETE API, which
 *     cascades to remove the profile row (via FK / trigger).
 *   - If the Auth account is already gone (orphaned profile) → delete the profile
 *     row directly so the admin dashboard stays clean.
 *   - Self-deletion is blocked to prevent accidental lockout.
 *
 * @requires SUPABASE_URL
 * @requires SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Multi-source superadmin check. Returns true if the caller is an admin in ANY of:
 *   1. `user_roles` table (role = 'admin')
 *   2. `profiles` table (role = 'superadmin')
 *   3. Supabase Auth user_metadata or app_metadata (role = 'superadmin')
 * This redundancy ensures authorization works even when one source is out-of-sync.
 */
async function isCallerSuperadmin(
  service: ReturnType<typeof createClient>,
  callerId: string
): Promise<boolean> {
  const { data: ur } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (ur) return true;

  const { data: prof } = await service
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();
  if (prof?.role === "superadmin") return true;

  const { data: userData, error } = await service.auth.admin.getUserById(callerId);
  if (error || !userData?.user) return false;
  const u = userData.user;
  const metaRole = (u.user_metadata as Record<string, unknown> | undefined)?.role;
  const appRole = (u.app_metadata as Record<string, unknown> | undefined)?.role;
  return metaRole === "superadmin" || appRole === "superadmin";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Supabase configuration missing");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const service = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await service.auth.getUser(token);
    const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    if (authErr || !caller) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    if (!(await isCallerSuperadmin(service, caller.id))) {
      return new Response(
        JSON.stringify({ success: false, message: "Forbidden" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    let body: { user_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid JSON body" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    const user_id = body.user_id;
    if (!user_id || typeof user_id !== "string") {
      return new Response(
        JSON.stringify({ success: false, message: "user_id is required" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    if (user_id === caller.id) {
      return new Response(
        JSON.stringify({ success: false, message: "You cannot delete your own account" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // Check if the target user still has an Auth account; they might only have
    // an orphaned profile row if a previous partial deletion occurred
    const { data: targetAuth, error: targetLookupErr } =
      await service.auth.admin.getUserById(user_id);
    if (
      targetLookupErr &&
      !/not found|no user|invalid|does not exist/i.test(targetLookupErr.message)
    ) {
      console.error("admin-delete-user getUserById:", targetLookupErr);
      return new Response(
        JSON.stringify({ success: false, message: targetLookupErr.message }),
        { status: 200, headers: jsonHeaders }
      );
    }

    const authUserPresent = !!targetAuth?.user;

    // Orphaned profile path — Auth account is already gone, clean up the DB row
    if (!authUserPresent) {
      const { error: profDelErr } = await service
        .from("profiles")
        .delete()
        .eq("id", user_id);
      if (profDelErr) {
        console.error("admin-delete-user profile delete:", profDelErr);
        return new Response(
          JSON.stringify({
            success: false,
            message: profDelErr.message || "Could not remove profile",
          }),
          { status: 200, headers: jsonHeaders }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "User removed (no login account was found; profile deleted if it existed)",
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // Use the raw Auth Admin REST API (not the JS SDK method) because the SDK's
    // deleteUser may not cascade correctly in all Supabase versions
    const baseUrl = supabaseUrl.replace(/\/$/, "");
    const delUrl = `${baseUrl}/auth/v1/admin/users/${encodeURIComponent(user_id)}`;
    const delRes = await fetch(delUrl, {
      method: "DELETE",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!delRes.ok) {
      const raw = await delRes.text();
      let detail = delRes.statusText || "Failed to delete user";
      if (raw) {
        try {
          const j = JSON.parse(raw) as {
            message?: string;
            msg?: string;
            error?: string;
            error_description?: string;
          };
          detail =
            j.message ||
            j.msg ||
            j.error_description ||
            j.error ||
            raw.slice(0, 500);
        } catch {
          detail = raw.slice(0, 500);
        }
      }
      console.error("admin-delete-user auth API:", delRes.status, detail);

      // Race condition guard: if Auth says 404 after we just confirmed the user
      // existed, re-check and clean up the profile to avoid stale orphan rows
      const looksNotFound =
        delRes.status === 404 ||
        /user not found/i.test(detail) ||
        detail === "User not found";
      if (looksNotFound) {
        const { data: recheck } = await service.auth.admin.getUserById(user_id);
        if (!recheck?.user) {
          const { error: profDelErr } = await service
            .from("profiles")
            .delete()
            .eq("id", user_id);
          if (profDelErr) {
            return new Response(
              JSON.stringify({ success: false, message: profDelErr.message }),
              { status: 200, headers: jsonHeaders }
            );
          }
          return new Response(
            JSON.stringify({
              success: true,
              message: "User removed (auth account was already gone; profile cleaned up)",
            }),
            { status: 200, headers: jsonHeaders }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, message: detail }),
        { status: 200, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "User deleted" }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ success: false, message: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
