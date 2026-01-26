import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  domain: string;
  recruiterName?: string;
  companyName?: string;
  jobTitle?: string;
  resumeFileName?: string;
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

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, professional_title, bio")
      .eq("id", user.id)
      .single();

    const { domain, recruiterName, companyName, jobTitle, resumeFileName }: GenerateRequest = await req.json();

    const systemPrompt = `You are an expert job application email writer. Write professional, personalized cold emails to recruiters. 
The emails should be:
- Professional but warm
- Concise (under 200 words)
- Highlight relevant skills
- Include a clear call-to-action
- Avoid generic phrases and clichés

Return your response as JSON with "subject" and "body" fields.`;

    const userPrompt = `Write an email for a job seeker with the following details:
- Name: ${profile?.name || "Job Seeker"}
- Title: ${profile?.professional_title || "Professional"}
- Bio: ${profile?.bio || "Experienced professional seeking new opportunities"}
- Domain: ${domain}
${recruiterName ? `- Recruiter Name: ${recruiterName}` : ""}
${companyName ? `- Company: ${companyName}` : ""}
${jobTitle ? `- Target Role: ${jobTitle}` : ""}
${resumeFileName ? `- Resume attached: ${resumeFileName}` : ""}

Generate a compelling cold email subject line and body.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("AI credits depleted. Please add credits to continue.");
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("Failed to generate email content");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Parse JSON from response
    let emailContent;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        emailContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback: use the content as body
      emailContent = {
        subject: `Interested in ${domain} opportunities`,
        body: content,
      };
    }

    console.log("Email generated successfully");

    return new Response(
      JSON.stringify(emailContent),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error generating email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
