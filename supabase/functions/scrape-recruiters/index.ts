import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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
  // Use exponential distribution to bias toward higher scores
  const rand = Math.random();
  // Transform to get more values in 50-100 range
  const score = Math.floor(50 + (rand * rand * 50)); // 50-100 range, biased higher
  return Math.min(100, Math.max(0, score));
}

// Extract email from text using regex
function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches && matches.length > 0 ? matches[0].toLowerCase() : null;
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Extract recruiter data from Firecrawl search results
async function extractRecruitersFromFirecrawl(
  firecrawlApiKey: string,
  countries: string[],
  queries: string[],
  maxResults: number
): Promise<RecruiterData[]> {
  const recruiters: RecruiterData[] = [];
  const seenEmails = new Set<string>();

  // Combine default queries with custom queries
  const allQueries = [
    ...queries,
    ...countries.flatMap(country => [
      `recruiter ${country}`,
      `HR manager ${country}`,
      `talent acquisition ${country}`,
      `recruitment specialist ${country}`,
    ])
  ];

  // Process more queries to get better results
  // Calculate how many results per query we need
  const resultsPerQuery = Math.ceil(maxResults / Math.max(allQueries.length, 1));
  const queriesToProcess = allQueries.slice(0, Math.min(allQueries.length, 50)); // Process up to 50 queries

  for (const query of queriesToProcess) {
    if (recruiters.length >= maxResults) break;

    try {
      // Use Firecrawl search API with higher limit
      const searchLimit = Math.min(50, maxResults - recruiters.length); // Increased from 10 to 50
      const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          limit: searchLimit,
        }),
      });

      if (!searchResponse.ok) {
        console.error(`Firecrawl search failed for query "${query}":`, searchResponse.statusText);
        continue;
      }

      const searchData = await searchResponse.json();
      const results = searchData.data || searchData.results || [];

      // Batch process results more efficiently
      const batchSize = 5;
      for (let i = 0; i < results.length; i += batchSize) {
        if (recruiters.length >= maxResults) break;

        const batch = results.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (result: any) => {
          if (recruiters.length >= maxResults) return null;

          try {
            // Try to extract email from search result metadata first (faster)
            let email = extractEmail(result.description || result.snippet || result.title || "");
            let scrapeData: any = null;
            let content = result.description || result.title || "";
            
            // If no email in metadata, scrape the page
            if (!email || !isValidEmail(email)) {
              const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${firecrawlApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: result.url,
                  pageOptions: {
                    onlyMainContent: true, // Faster scraping
                  },
                }),
              });

              if (!scrapeResponse.ok) return null;

              scrapeData = await scrapeResponse.json();
              content = scrapeData.data?.markdown || scrapeData.data?.content || result.description || result.title || "";
              email = extractEmail(content);
            }

            if (!email || !isValidEmail(email) || seenEmails.has(email)) {
              return null;
            }

            seenEmails.add(email);
            let name = result.title?.split(" - ")[0]?.split(" | ")[0] || "Recruiter";
            const namePatterns = [
              /(?:Name|Contact|Recruiter|by)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
              /([A-Z][a-z]+\s+[A-Z][a-z]+)/,
            ];
            for (const pattern of namePatterns) {
              const match = content.match(pattern);
              if (match) {
                name = match[1] || match[0];
                break;
              }
            }

            // Extract company
            let company: string | undefined = result.company;
            if (!company) {
              const companyPatterns = [
                /(?:Company|Organization|Works at|at)[:\s]+([A-Z][a-zA-Z\s&]+)/i,
                /@\s*([A-Z][a-zA-Z\s&]+)/i,
              ];
              for (const pattern of companyPatterns) {
                const match = content.match(pattern);
                if (match) {
                  company = match[1]?.trim();
                  break;
                }
              }
            }

            // Infer domain from company or content
            let domain: string | undefined;
            const contentLower = (content + " " + (company || "")).toLowerCase();
            const techKeywords = ["tech", "software", "IT", "engineering", "developer"];
            const financeKeywords = ["finance", "banking", "fintech", "investment"];
            const healthcareKeywords = ["health", "medical", "pharma", "hospital"];
            
            if (techKeywords.some(k => contentLower.includes(k))) {
              domain = "Technology";
            } else if (financeKeywords.some(k => contentLower.includes(k))) {
              domain = "Finance";
            } else if (healthcareKeywords.some(k => contentLower.includes(k))) {
              domain = "Healthcare";
            }

            return {
              name: name.trim() || "Recruiter",
              email,
              company: company || undefined,
              domain: domain || undefined,
              tier: assignRandomTier(),
              quality_score: assignRandomQualityScore(),
              source_url: result.url,
            };
          } catch (error) {
            console.error(`Error processing result ${result.url}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validRecruiters = batchResults.filter(r => r !== null) as RecruiterData[];
        recruiters.push(...validRecruiters);

        // Rate limiting - wait between batches
        if (i + batchSize < results.length && recruiters.length < maxResults) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay for faster processing
        }
      }
    } catch (error) {
      console.error(`Error processing query "${query}":`, error);
    }
  }

  return recruiters;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { countries = ["IN", "US"], queries = [], max_results = 50, config_id }: ScrapeRequest = await req.json();

    // Create scraping log entry
    const { data: logEntry, error: logError } = await supabase
      .from("scraping_logs")
      .insert({
        platform: "firecrawl",
        status: "running",
        records_found: 0,
        records_added: 0,
        records_skipped: 0,
        errors: [],
      })
      .select()
      .single();

    if (logError) {
      throw new Error(`Failed to create log entry: ${logError.message}`);
    }

    const logId = logEntry.id;
    const errors: string[] = [];
    let recordsFound = 0;
    let recordsAdded = 0;
    let recordsSkipped = 0;

    try {
      // Extract recruiters using Firecrawl
      const recruiters = await extractRecruitersFromFirecrawl(
        firecrawlApiKey,
        countries,
        queries,
        max_results
      );

      recordsFound = recruiters.length;

      // Check existing emails to avoid duplicates
      const emails = recruiters.map(r => r.email);
      const { data: existingRecruiters } = await supabase
        .from("recruiters")
        .select("email")
        .in("email", emails);

      const existingEmails = new Set(existingRecruiters?.map(r => r.email) || []);

      // Insert new recruiters
      const recruitersToInsert = recruiters
        .filter(r => !existingEmails.has(r.email))
        .map(({ name, email, company, domain, tier, quality_score }) => ({
          name,
          email,
          company: company || null,
          domain: domain || null,
          tier: tier || "FREE",
          quality_score: quality_score || 0,
          source_platform: "firecrawl",
          scraped_at: new Date().toISOString(),
        }));

      if (recruitersToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("recruiters")
          .insert(recruitersToInsert);

        if (insertError) {
          errors.push(`Failed to insert recruiters: ${insertError.message}`);
        } else {
          recordsAdded = recruitersToInsert.length;
        }
      }

      recordsSkipped = recruiters.length - recordsAdded;

      // Store detailed scraped data in metadata
      const scrapedData = recruiters.map(r => ({
        name: r.name,
        email: r.email,
        company: r.company || null,
        domain: r.domain || null,
        tier: r.tier,
        quality_score: r.quality_score,
        source_url: r.source_url || null,
        added: !existingEmails.has(r.email),
      }));

      // Update scraping log with detailed data
      await supabase
        .from("scraping_logs")
        .update({
          status: "completed",
          records_found: recordsFound,
          records_added: recordsAdded,
          records_skipped: recordsSkipped,
          completed_at: new Date().toISOString(),
          errors: errors.length > 0 ? errors : null,
          metadata: {
            scraped_recruiters: scrapedData,
            countries: countries,
            queries: queries,
            max_results: max_results,
          },
        })
        .eq("id", logId);

      // Update scraper config if config_id provided
      if (config_id) {
        await supabase
          .from("scraper_config")
          .update({
            last_run_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            last_scrape_count: recordsAdded,
          })
          .eq("id", config_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully scraped ${recordsAdded} recruiters`,
          records_found: recordsFound,
          records_added: recordsAdded,
          records_skipped: recordsSkipped,
          scraped_data: scrapedData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      // Update log with error
      await supabase
        .from("scraping_logs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          errors: [error.message],
        })
        .eq("id", logId);

      throw error;
    }
  } catch (error: any) {
    console.error("Scraping error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to scrape recruiters" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

