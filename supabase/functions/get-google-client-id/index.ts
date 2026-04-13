/**
 * @module get-google-client-id
 * @description Supabase Edge Function that exposes the Google OAuth Client ID to the
 * frontend without embedding it in client-side bundles. This keeps the client ID
 * managed as a server-side secret while still allowing the frontend to initiate
 * the OAuth consent flow.
 *
 * @route GET /get-google-client-id
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");

    if (!googleClientId) {
      return new Response(
        JSON.stringify({ error: "Google OAuth is not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ clientId: googleClientId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error fetching Google Client ID:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
