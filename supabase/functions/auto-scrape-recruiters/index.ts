import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Auto-scrape job started');

    // Fetch all enabled configs
    const { data: configs, error: configError } = await supabase
      .from('scraper_config')
      .select('*')
      .eq('is_enabled', true)
      .eq('auto_scrape_enabled', true);

    if (configError) {
      console.error('Failed to fetch scraper configs:', configError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch configs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!configs || configs.length === 0) {
      console.log('No auto-scrape configs enabled');
      return new Response(
        JSON.stringify({ success: true, message: 'No auto-scrape configs enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const config of configs) {
      console.log('Processing config:', config.platform, 'Countries:', config.target_countries);

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/scrape-recruiters`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            countries: config.target_countries || ['IN', 'US'],
            queries: config.search_queries || [],
            max_results: config.quota_per_day || 50,
            config_id: config.id,
          }),
        });

        const result = await response.json();
        results.push({
          platform: config.platform,
          success: result.success,
          message: result.message,
          data: result.data,
        });

      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error processing config:', config.platform, error);
        results.push({
          platform: config.platform,
          success: false,
          error: errMsg,
        });
      }
    }

    console.log('Auto-scrape job completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${configs.length} scraper config(s)`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-scrape error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
