import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FollowUpRequest {
  thread_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

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

    const { thread_id }: FollowUpRequest = await req.json();

    // Get thread with messages
    const { data: thread, error: threadError } = await supabase
      .from("conversation_threads")
      .select(`
        *,
        conversation_messages(*)
      `)
      .eq("id", thread_id)
      .eq("user_id", user.id)
      .single();

    if (threadError || !thread) {
      throw new Error("Thread not found");
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, professional_title")
      .eq("id", user.id)
      .single();

    const lastMessage = thread.conversation_messages
      ?.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

    const daysSinceLastContact = lastMessage 
      ? Math.floor((Date.now() - new Date(lastMessage.sent_at).getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    const systemPrompt = `You are an expert at writing professional follow-up emails. Generate a polite, professional follow-up email that:
- References the previous email without being pushy
- Adds value or new information if possible
- Has a clear but soft call-to-action
- Is concise (under 150 words)

Return your response as JSON with "subject", "body", "priority" (low/medium/high), and "reason" fields.`;

    const userPrompt = `Generate a follow-up email for:
- Sender: ${profile?.name || "Job Seeker"} (${profile?.professional_title || "Professional"})
- Recipient: ${thread.recruiter_name || "Recruiter"} at ${thread.company_name || "Company"}
- Days since last contact: ${daysSinceLastContact}
- Original subject: ${thread.subject_line || "Job Opportunity"}
- Thread status: ${thread.status}
- Total messages in thread: ${thread.total_messages || 1}
- Recruiter has replied: ${thread.recruiter_messages_count > 0 ? "Yes" : "No"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate follow-up");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let followUpContent;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        followUpContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      followUpContent = {
        subject: `Following up: ${thread.subject_line || "Our conversation"}`,
        body: content,
        priority: daysSinceLastContact > 7 ? "high" : "medium",
        reason: `${daysSinceLastContact} days since last contact`,
      };
    }

    // Store suggestion
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + (daysSinceLastContact > 7 ? 0 : 3));

    await supabase
      .from("follow_up_suggestions")
      .insert({
        thread_id,
        suggested_date: suggestedDate.toISOString(),
        suggested_subject: followUpContent.subject,
        suggested_body_preview: followUpContent.body?.substring(0, 200),
        priority: followUpContent.priority || "medium",
        reason: followUpContent.reason || "Automated follow-up suggestion",
        ai_generated: true,
      });

    console.log("Follow-up generated for thread:", thread_id);

    return new Response(
      JSON.stringify(followUpContent),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating follow-up:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
