import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log("Starting cleanup job...");
    console.log("Current time:", now.toISOString());
    console.log("Looking for cooldowns expired between:", oneDayAgo.toISOString(), "and", now.toISOString());

    // Step 1: Find recently expired cooldowns (last 24h) for notifications
    const { data: recentlyExpired, error: expiredError } = await supabase
      .from("email_cooldowns")
      .select("id, user_id, recruiter_email, blocked_until")
      .lt("blocked_until", now.toISOString())
      .gte("blocked_until", oneDayAgo.toISOString());

    if (expiredError) {
      console.error("Error fetching expired cooldowns:", expiredError);
      throw expiredError;
    }

    console.log(`Found ${recentlyExpired?.length || 0} recently expired cooldowns`);

    let notificationsSent = 0;
    let emailsSent = 0;

    if (recentlyExpired && recentlyExpired.length > 0) {
      // Get unique user IDs
      const userIds = [...new Set(recentlyExpired.map(c => c.user_id))];
      console.log(`Processing notifications for ${userIds.length} users`);

      // Fetch user profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      if (profileError) {
        console.error("Error fetching profiles:", profileError);
      }

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Group cooldowns by user
      const cooldownsByUser = new Map<string, typeof recentlyExpired>();
      for (const cooldown of recentlyExpired) {
        const existing = cooldownsByUser.get(cooldown.user_id) || [];
        existing.push(cooldown);
        cooldownsByUser.set(cooldown.user_id, existing);
      }

      // Send notifications for each user
      for (const [userId, cooldowns] of cooldownsByUser) {
        const profile = profileMap.get(userId);
        if (!profile) {
          console.log(`Profile not found for user ${userId}`);
          continue;
        }

        const recruiterEmails = cooldowns.map(c => c.recruiter_email);
        const recruiterList = recruiterEmails.length > 3 
          ? `${recruiterEmails.slice(0, 3).join(", ")} and ${recruiterEmails.length - 3} more`
          : recruiterEmails.join(", ");

        console.log(`Creating notification for user ${profile.name} (${recruiterEmails.length} recruiters)`);

        // Create in-app notification
        const { error: notifError } = await supabase
          .from("user_notifications")
          .insert({
            user_id: userId,
            title: "Recruiters Available to Contact",
            message: `You can now send emails to: ${recruiterList}`,
            type: "cooldown_expired",
            metadata: { 
              recruiter_emails: recruiterEmails,
              count: recruiterEmails.length
            }
          });

        if (notifError) {
          console.error(`Failed to create notification for user ${userId}:`, notifError);
        } else {
          notificationsSent++;
          console.log(`✓ In-app notification created for ${profile.name}`);
        }

        // Optional: Send email notification via Resend
        if (resendApiKey && profile.email) {
          try {
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Good News! Recruiters Available</h2>
                <p>Hi ${profile.name || 'there'},</p>
                <p>You can now contact the following recruiter(s) again:</p>
                <ul style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                  ${recruiterEmails.map(email => `<li style="margin: 8px 0;">${email}</li>`).join('')}
                </ul>
                <p>Visit your dashboard to compose and send emails to these recruiters.</p>
                <a href="${supabaseUrl.replace('/functions/v1', '')}/compose" 
                   style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin: 20px 0;">
                  Compose Email
                </a>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  This is an automated notification from JobSeeker.
                </p>
              </div>
            `;

            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "JobSeeker <noreply@startworking.in>",
                to: profile.email,
                subject: `${recruiterEmails.length} Recruiter(s) Available to Contact`,
                html: emailHtml,
              }),
            });

            if (emailResponse.ok) {
              emailsSent++;
              console.log(`✓ Email notification sent to ${profile.email}`);
            } else {
              const errorText = await emailResponse.text();
              console.error(`Failed to send email to ${profile.email}:`, errorText);
            }
          } catch (emailError) {
            console.error(`Error sending email to ${profile.email}:`, emailError);
          }
        }
      }
    }

    // Step 2: Delete cooldowns expired more than 7 days ago
    console.log("Deleting cooldowns expired before:", sevenDaysAgo.toISOString());
    
    const { data: deleted, error: deleteError } = await supabase
      .from("email_cooldowns")
      .delete()
      .lt("blocked_until", sevenDaysAgo.toISOString())
      .select("id");

    if (deleteError) {
      console.error("Error deleting old cooldowns:", deleteError);
      throw deleteError;
    }

    const deletedCount = deleted?.length || 0;
    console.log(`✓ Deleted ${deletedCount} old cooldown records`);

    const result = {
      success: true,
      timestamp: now.toISOString(),
      recently_expired_count: recentlyExpired?.length || 0,
      notifications_sent: notificationsSent,
      emails_sent: emailsSent,
      deleted_count: deletedCount,
    };

    console.log("Cleanup job completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Cleanup job error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
