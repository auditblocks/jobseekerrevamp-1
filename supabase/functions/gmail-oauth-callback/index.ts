import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OAuthRequest {
  code: string;
  redirect_uri: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { code, redirect_uri }: OAuthRequest = await req.json();

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange authorization code");
    }

    const tokens = await tokenResponse.json();
    console.log("Gmail connected for user:", user.id);

    // Store refresh token
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        google_refresh_token: tokens.refresh_token,
        gmail_token_refreshed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to store token:", updateError);
      throw new Error("Failed to save Gmail connection");
    }

    // Enable Gmail watch for push notifications
    try {
      const googleCloudProjectId = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID") || "jobseeker-production";
      const accessToken = tokens.access_token;

      const watchResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/watch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topicName: `projects/${googleCloudProjectId}/topics/gmail-notifications`,
            labelIds: ["INBOX"], // Watch for messages in inbox
          }),
        }
      );

      if (watchResponse.ok) {
        const watchData = await watchResponse.json();
        console.log("Gmail watch enabled:", watchData);
        
        // Calculate expiration time (Gmail watch expires after 7 days)
        const expirationTime = new Date();
        expirationTime.setDate(expirationTime.getDate() + 7);
        
        // Get current preferences to preserve existing data
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user.id)
          .single();
        
        const currentPreferences = currentProfile?.preferences || {};
        
        // Store expiration time in preferences JSONB field
        await supabase
          .from("profiles")
          .update({
            preferences: {
              ...currentPreferences,
              gmailWatchExpiresAt: expirationTime.toISOString(),
            },
          })
          .eq("id", user.id);
        
        console.log(`Gmail watch will expire on: ${expirationTime.toISOString()}`);
      } else {
        const errorText = await watchResponse.text();
        console.error("Failed to enable Gmail watch:", errorText);
        // Don't fail the OAuth flow if watch setup fails
        // The user can still use Gmail, just won't get push notifications
        console.warn("Gmail watch setup failed, but OAuth connection succeeded. User can still use Gmail.");
      }
    } catch (error) {
      console.error("Error setting up Gmail watch:", error);
      // Don't fail the OAuth flow if watch setup fails
      console.warn("Gmail watch setup failed, but OAuth connection succeeded. User can still use Gmail.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Gmail connected successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("OAuth error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
