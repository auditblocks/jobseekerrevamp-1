import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScrapeRequest {
  countries?: string[];
  queries?: string[];
  max_results?: number;
  config_id?: string;
}

interface RecruiterData {
  name: string;
  email: string;
  company?: string;
  domain?: string;
  tier: string;
  quality_score: number;
  source_url?: string;
  source_platform: string;
}

// Random tier assignment with weighted distribution
function assignRandomTier(): string {
  const rand = Math.random();
  if (rand < 0.6) return "FREE";      // 60% probability
  if (rand < 0.9) return "PRO";       // 30% probability
  return "PRO_MAX";                    // 10% probability
}

// Random quality score (0-100, weighted toward higher scores)
function assignRandomQualityScore(): number {
  const rand = Math.random();
  const score = Math.floor(50 + (rand * rand * 50)); // 50-100 range, biased higher
  return Math.min(100, Math.max(0, score));
}

// Gemini Flash Parsing Logic
async function parseWithGemini(
  content: string,
  geminiApiKey: string
): Promise<{ name?: string; email?: string; company?: string; domain?: string; role?: string } | null> {
  if (!content || content.length < 50) return null;

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using Flash for speed/cost

    const prompt = `
      Extract recruiter details from the following text. 
      Return ONLY a VALID JSON object with no markdown formatting.
      Fields required: 
      - name (full name)
      - email (valid email address only)
      - company (current company name)
      - role (job title)
      - domain (industry: "Technology", "Finance", "Healthcare", or "Other" based on context)

      Text:
      ${content.substring(0, 8000)} // Truncate to avoid context limit issues
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean code blocks if present
    const cleanedJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanedJson);

    if (data.email && data.email.includes("@")) {
      return data;
    }
    return null;
  } catch (e) {
    console.error("Gemini parsing error:", e);
    return null;
  }
}

async function extractRecruitersFromFirecrawl(
  firecrawlApiKey: string,
  geminiApiKey: string,
  countries: string[],
  queries: string[],
  maxResults: number
): Promise<RecruiterData[]> {
  const recruiters: RecruiterData[] = [];
  const seenEmails = new Set<string>();

  // Optimized Search Queries for Recruiter Hunting
  const searchQueries = [
    ...queries,
    ...countries.flatMap(country => [
      `site:linkedin.com/in "recruiter" "email me at" ${country}`,
      `site:linkedin.com/in "talent acquisition" "@gmail.com" ${country}`,
      `site:linkedin.com/in "hiring" "contact me" ${country}`,
      `"recruiter" "resume" "email" ${country} filetype:pdf`, // Resumes often have recruiter contacts
      `intitle:"hiring" "send your resume to" ${country}`
    ])
  ];

  // Randomize queries to avoid pattern blocking
  const shuffledQueries = searchQueries.sort(() => 0.5 - Math.random()).slice(0, 15);

  for (const query of shuffledQueries) {
    if (recruiters.length >= maxResults) break;

    try {
      console.log(`Searching Firecrawl for: ${query}`);
      const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          limit: 10,
          pageOptions: { fetchPageContent: true } // Get content immediately to save scrape calls
        }),
      });

      if (!searchResponse.ok) continue;

      const searchData = await searchResponse.json();
      const results = searchData.data || searchData.results || [];

      // Process results in parallel batches
      const batchPromises = results.map(async (result: any) => {
        if (recruiters.length >= maxResults) return null;

        const content = result.markdown || result.description || result.snippet || "";

        // 1. Try regex first (cheap & fast)
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const quickEmailMatch = content.match(emailRegex);

        // 2. If regex finds something potentially valid, allow it or verify with Gemini
        // For higher quality, we send to Gemini to extract structured data properly

        const extracted = await parseWithGemini(content, geminiApiKey);

        if (extracted && extracted.email && !seenEmails.has(extracted.email.toLowerCase())) {
          seenEmails.add(extracted.email.toLowerCase());
          return {
            name: extracted.name || "Recruiter",
            email: extracted.email.toLowerCase(),
            company: extracted.company,
            domain: extracted.domain || "Other",
            tier: assignRandomTier(),
            quality_score: assignRandomQualityScore(),
            source_url: result.url,
            source_platform: "firecrawl_gemini"
          } as RecruiterData;
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      const validRecruiters = batchResults.filter(r => r !== null) as RecruiterData[];
      recruiters.push(...validRecruiters);

    } catch (e) {
      console.error(`Query failed: ${query}`, e);
    }

    // Respect rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  return recruiters;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!firecrawlApiKey || !geminiApiKey) {
      throw new Error("Missing API keys (FIRECRAWL_API_KEY or GOOGLE_GEMINI_API_KEY)");
    }

    const { countries = ["IN", "US"], queries = [], max_results = 20, config_id }: ScrapeRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create Log
    const { data: logEntry, error: logError } = await supabase
      .from("scraping_logs")
      .insert({
        platform: "firecrawl",
        status: "running",
        records_found: 0,
        records_added: 0,
        records_skipped: 0,
        metadata: { countries, queries, max_results }
      })
      .select()
      .single();

    if (logError) throw logError;
    const logId = logEntry.id;

    try {
      const recruiters = await extractRecruitersFromFirecrawl(
        firecrawlApiKey,
        geminiApiKey,
        countries,
        queries,
        max_results
      );

      // Deduplicate against DB
      const emails = recruiters.map(r => r.email);
      const { data: existing } = await supabase
        .from("recruiters")
        .select("email")
        .in("email", emails);

      const existingSet = new Set(existing?.map(e => e.email) || []);
      const newRecruiters = recruiters.filter(r => !existingSet.has(r.email));

      if (newRecruiters.length > 0) {
        await supabase.from("recruiters").insert(newRecruiters.map(r => ({
          ...r,
          scraped_at: new Date().toISOString()
        })));
      }

      // Prepare detailed scraped data for logs
      const scrapedData = recruiters.map(r => ({
        name: r.name,
        email: r.email,
        company: r.company || null,
        domain: r.domain || null,
        tier: r.tier,
        quality_score: r.quality_score,
        source_url: r.source_url || null,
        source_platform: r.source_platform,
        added: !existingSet.has(r.email)
      }));

      // Update Log
      await supabase.from("scraping_logs").update({
        status: "completed",
        records_found: recruiters.length,
        records_added: newRecruiters.length,
        records_skipped: recruiters.length - newRecruiters.length,
        completed_at: new Date().toISOString(),
        metadata: {
          ...logEntry.metadata,
          scraped_recruiters: scrapedData
        }
      }).eq("id", logId);

      // Update Config if exists
      if (config_id) {
        await supabase.from("scraper_config").update({
          last_run_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          last_scrape_count: newRecruiters.length
        }).eq("id", config_id);
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Scraped ${newRecruiters.length} new recruiters`,
        data: newRecruiters
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err: any) {
      await supabase.from("scraping_logs").update({
        status: "failed",
        errors: [err.message],
        completed_at: new Date().toISOString()
      }).eq("id", logId);
      throw err;
    }

  } catch (error: any) {
    console.error("Scraper Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

