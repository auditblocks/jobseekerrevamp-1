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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all enabled scraper configs
    const { data: configs, error: configError } = await supabase
      .from("scraper_config")
      .select("*")
      .eq("auto_scrape_enabled", true)
      .eq("is_enabled", true);

    if (configError) {
      throw new Error(`Failed to fetch configs: ${configError.message}`);
    }

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No enabled scraper configs found",
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    // Process each enabled config
    for (const config of configs) {
      try {
        // Update last_run_at
        await supabase
          .from("scraper_config")
          .update({ last_run_at: new Date().toISOString() })
          .eq("id", config.id);

        // Call scrape-recruiters function
        const scrapeUrl = `${supabaseUrl}/functions/v1/scrape-recruiters`;
        const scrapeResponse = await fetch(scrapeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            countries: config.target_countries || ["IN", "US"],
            queries: config.search_queries || [],
            max_results: config.quota_per_day || 50,
            config_id: config.id,
          }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          throw new Error(`Scrape failed: ${errorText}`);
        }

        const scrapeResult = await scrapeResponse.json();
        results.push({
          config_id: config.id,
          platform: config.platform,
          success: scrapeResult.success,
          records_added: scrapeResult.records_added || 0,
          records_skipped: scrapeResult.records_skipped || 0,
        });
      } catch (error: any) {
        console.error(`Error processing config ${config.id}:`, error);
        results.push({
          config_id: config.id,
          platform: config.platform,
          success: false,
          error: error.message,
        });
      }
    }

    const totalAdded = results.reduce((sum, r) => sum + (r.records_added || 0), 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${configs.length} config(s), added ${totalAdded} recruiters`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Auto-scrape error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to run auto-scrape",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

