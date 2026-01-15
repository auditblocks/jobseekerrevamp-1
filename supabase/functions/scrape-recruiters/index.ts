import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecruiterData {
  name: string;
  email: string;
  company: string | null;
  domain: string | null;
  tier: string;
  quality_score: number;
  source_platform: string;
}

// Available tiers for random assignment
const TIERS = ['FREE', 'PRO', 'PRO_MAX'];

function getRandomTier(): string {
  return TIERS[Math.floor(Math.random() * TIERS.length)];
}

function getRandomQualityScore(): number {
  return Math.floor(Math.random() * 51) + 50; // 50-100
}

// RFC 5322 compliant email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(email)) return false;

  const [localPart, domain] = email.split('@');
  if (localPart.length > 64) return false;
  if (email.length > 254) return false;

  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;

  return true;
}

// Country-specific search queries
const countrySearchQueries: Record<string, string[]> = {
  IN: [
    'tech recruiter India hiring email',
    'HR manager IT company Bangalore email contact',
    'talent acquisition specialist Mumbai email',
    'recruitment consultant Delhi NCR contact',
    'staffing agency India tech email',
    'software recruiter Hyderabad hiring',
    'IT recruitment agency Pune email',
    'tech headhunter Chennai contact',
    'HR recruiter Kolkata email',
    'recruitment manager Noida hiring',
    'talent scout India tech jobs',
    'technical recruiter Gurgaon email',
    'senior recruiter India LinkedIn',
    'recruitment specialist Ahmedabad',
    'hiring manager IT services India',
  ],
  US: [
    'tech recruiter Silicon Valley hiring email',
    'HR manager software company USA email',
    'talent acquisition specialist New York tech',
    'recruitment consultant California email',
    'staffing agency USA technology contact',
    'tech headhunter San Francisco email',
    'software recruiter Seattle hiring',
    'IT recruitment Austin Texas email',
    'talent acquisition Los Angeles tech',
    'HR recruiter Boston startup email',
    'tech recruitment Chicago contact',
    'senior recruiter Denver tech',
    'software hiring manager Atlanta',
    'recruitment specialist Miami tech',
    'IT staffing Dallas email contact',
  ],
  UK: [
    'tech recruiter London hiring email',
    'HR manager IT company UK email',
    'talent acquisition specialist Manchester contact',
    'recruitment consultant United Kingdom email',
    'tech headhunter Birmingham hiring',
    'software recruiter Edinburgh email',
    'IT recruitment Leeds contact',
    'talent scout Bristol tech',
    'senior recruiter Cambridge tech',
    'recruitment manager Liverpool email',
  ],
  CA: [
    'tech recruiter Toronto hiring email',
    'HR manager software company Canada email',
    'talent acquisition specialist Vancouver contact',
    'recruitment consultant Montreal tech email',
    'IT recruiter Calgary hiring',
    'tech headhunter Ottawa email',
    'software recruiter Waterloo contact',
    'senior recruiter Edmonton tech',
  ],
  AU: [
    'tech recruiter Sydney hiring email',
    'HR manager IT company Australia email',
    'talent acquisition specialist Melbourne contact',
    'recruitment consultant Brisbane tech',
    'IT recruiter Perth email',
    'tech headhunter Adelaide hiring',
    'software recruiter Canberra contact',
  ],
  DE: [
    'tech recruiter Berlin hiring email',
    'HR manager IT company Germany email',
    'talent acquisition specialist Munich contact',
    'recruitment consultant Frankfurt tech',
    'IT recruiter Hamburg email',
    'tech headhunter Dusseldorf hiring',
    'software recruiter Cologne contact',
  ],
  SG: [
    'tech recruiter Singapore hiring email',
    'HR manager IT company Singapore email',
    'talent acquisition specialist Singapore contact',
    'recruitment consultant Singapore tech',
  ],
  AE: [
    'tech recruiter Dubai hiring email',
    'HR manager IT company UAE email',
    'talent acquisition specialist Abu Dhabi',
    'recruitment consultant Middle East tech',
  ],
};

function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  return matches.filter(email => {
    const lowerEmail = email.toLowerCase();

    if (!isValidEmail(email)) {
      console.log(`Invalid email format skipped: ${email}`);
      return false;
    }

    return !lowerEmail.includes('noreply') &&
      !lowerEmail.includes('no-reply') &&
      !lowerEmail.includes('support@') &&
      !lowerEmail.includes('info@') &&
      !lowerEmail.includes('contact@') &&
      !lowerEmail.includes('example.') &&
      !lowerEmail.includes('test@') &&
      !lowerEmail.includes('demo@') &&
      !lowerEmail.includes('admin@') &&
      !lowerEmail.includes('webmaster@') &&
      !lowerEmail.endsWith('.png') &&
      !lowerEmail.endsWith('.jpg') &&
      !lowerEmail.endsWith('.gif') &&
      !lowerEmail.endsWith('.svg');
  });
}

function extractNameFromContext(text: string, email: string): string {
  const emailIndex = text.indexOf(email);
  if (emailIndex === -1) return '';

  const beforeEmail = text.substring(Math.max(0, emailIndex - 200), emailIndex);

  const namePatterns = [
    /([A-Z][a-z]+ [A-Z][a-z]+)\s*[-|,]\s*$/,
    /by\s+([A-Z][a-z]+ [A-Z][a-z]+)\s*$/,
    /([A-Z][a-z]+ [A-Z][a-z]+)\s*$/,
  ];

  for (const pattern of namePatterns) {
    const match = beforeEmail.match(pattern);
    if (match) return match[1];
  }

  return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function extractCompany(email: string, text: string): string {
  const domain = email.split('@')[1];
  if (!domain) return '';

  const genericProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'mail.com'];
  if (genericProviders.includes(domain.toLowerCase())) {
    const companyPatterns = [
      /at\s+([A-Z][A-Za-z0-9\s&]+(?:Inc|LLC|Ltd|Corp|Company)?)/,
      /from\s+([A-Z][A-Za-z0-9\s&]+(?:Inc|LLC|Ltd|Corp|Company)?)/,
    ];
    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return '';
  }

  return domain.split('.')[0].replace(/\b\w/g, c => c.toUpperCase());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const targetCountries: string[] = body.countries || ['IN', 'US'];
    const customQueries: string[] = body.queries || [];
    const maxResults = Math.min(body.max_results || 10000, 10000);
    const configId = body.config_id;

    console.log('Starting recruiter scraping for countries:', targetCountries);

    // Fetch available domains for random assignment
    const { data: domainsData } = await supabase
      .from('domains')
      .select('name')
      .eq('is_active', true);

    const availableDomains = domainsData?.map(d => d.name) || [];

    // Create scraping log entry
    const { data: logEntry, error: logError } = await supabase
      .from('scraping_logs')
      .insert({
        platform: 'firecrawl',
        status: 'running',
        started_at: new Date().toISOString(),
        metadata: { countries: targetCountries, queries: customQueries },
        progress_percent: 0,
        current_phase: 'Initializing...',
      })
      .select()
      .single();

    if (logError) console.error('Failed to create scraping log:', logError);

    const logId = logEntry?.id;
    const foundRecruiters: RecruiterData[] = [];
    const errors: string[] = [];
    let totalRecordsFound = 0;

    // Progress update helper
    const updateProgress = async (percent: number, phase: string, estimatedSeconds?: number) => {
      if (!logId) return;
      const updates: Record<string, unknown> = {
        progress_percent: percent,
        current_phase: phase,
        records_found: totalRecordsFound,
      };
      if (estimatedSeconds !== undefined) {
        updates.estimated_completion_at = new Date(Date.now() + estimatedSeconds * 1000).toISOString();
      }
      await supabase.from('scraping_logs').update(updates).eq('id', logId);
    };

    // Build search queries
    const searchQueries: string[] = [];
    for (const country of targetCountries) {
      const countryQueries = countrySearchQueries[country] || [];
      searchQueries.push(...countryQueries);
    }
    searchQueries.push(...customQueries);

    const maxQueries = Math.min(Math.ceil(maxResults / 50), 100);
    const queriesToRun = searchQueries.slice(0, maxQueries);
    const totalQueries = queriesToRun.length;
    let completedQueries = 0;

    await updateProgress(5, `Starting ${totalQueries} search queries...`, totalQueries * 2);

    // Process queries in concurrent batches
    const CONCURRENT_REQUESTS = 5;

    const processQuery = async (query: string): Promise<void> => {
      try {
        console.log('Searching:', query);

        const response = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            limit: 100,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Firecrawl search error:', response.status, errorText);
          errors.push(`Search failed for "${query}": ${response.status}`);
          return;
        }

        const searchData = await response.json();

        if (searchData.success && searchData.data) {
          for (const result of searchData.data) {
            const content = (result.markdown || '') + ' ' + (result.description || '') + ' ' + (result.title || '');
            const emails = extractEmails(content);

            for (const email of emails) {
              totalRecordsFound++;
              const name = extractNameFromContext(content, email);
              const company = extractCompany(email, content);

              const randomDomain = availableDomains.length > 0
                ? availableDomains[Math.floor(Math.random() * availableDomains.length)]
                : null;

              foundRecruiters.push({
                name: name || 'Unknown',
                email,
                company: company || null,
                domain: randomDomain,
                tier: getRandomTier(),
                quality_score: getRandomQualityScore(),
                source_platform: 'firecrawl',
              });
            }
          }
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error searching:', query, error);
        errors.push(`Error searching "${query}": ${errMsg}`);
      }
    };

    // Process in batches
    for (let i = 0; i < queriesToRun.length; i += CONCURRENT_REQUESTS) {
      const batch = queriesToRun.slice(i, i + CONCURRENT_REQUESTS);
      await Promise.all(batch.map(processQuery));

      completedQueries += batch.length;
      const searchProgress = Math.round(5 + (completedQueries / totalQueries) * 55);
      await updateProgress(searchProgress, `Searching... (${completedQueries}/${totalQueries} queries, ${foundRecruiters.length} found)`, (totalQueries - completedQueries) * 2);

      if (foundRecruiters.length >= maxResults) {
        console.log(`Reached target of ${maxResults} recruiters, stopping early`);
        break;
      }

      // Rate limiting
      if (i + CONCURRENT_REQUESTS < queriesToRun.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await updateProgress(65, `Processing ${foundRecruiters.length} recruiters...`, 10);

    // Deduplicate by email
    const uniqueRecruiters = Array.from(
      new Map(foundRecruiters.map(r => [r.email.toLowerCase(), r])).values()
    );

    console.log(`Found ${uniqueRecruiters.length} unique recruiters`);

    // Check existing recruiters
    const uniqueEmails = uniqueRecruiters.map(r => r.email.toLowerCase());
    const { data: existingRecruiters } = await supabase
      .from('recruiters')
      .select('email')
      .in('email', uniqueEmails);

    const existingEmailsSet = new Set(
      (existingRecruiters || []).map(r => r.email.toLowerCase())
    );

    const newRecruiters = uniqueRecruiters.filter(
      r => !existingEmailsSet.has(r.email.toLowerCase())
    );

    const alreadyExistingCount = uniqueRecruiters.length - newRecruiters.length;
    console.log(`${alreadyExistingCount} already exist, ${newRecruiters.length} are new`);

    await updateProgress(70, `Inserting ${newRecruiters.length} new recruiters...`, Math.ceil(newRecruiters.length / 500) * 2);

    // Batch insert
    let insertedCount = 0;
    let skippedCount = alreadyExistingCount;
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(newRecruiters.length / BATCH_SIZE);

    for (let i = 0; i < newRecruiters.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batch = newRecruiters.slice(i, i + BATCH_SIZE);
      const batchData = batch.map(recruiter => ({
        name: recruiter.name,
        email: recruiter.email,
        company: recruiter.company,
        domain: recruiter.domain,
        tier: recruiter.tier,
        quality_score: recruiter.quality_score,
        source_platform: recruiter.source_platform,
        scraped_at: new Date().toISOString(),
      }));

      const { data: insertedData, error: batchError } = await supabase
        .from('recruiters')
        .upsert(batchData, { onConflict: 'email', ignoreDuplicates: true })
        .select('id');

      if (batchError) {
        console.error(`Batch ${batchNumber} error:`, batchError);
        errors.push(`Batch insert error: ${batchError.message}`);
      } else {
        const batchInserted = insertedData?.length || batch.length;
        insertedCount += batchInserted;
        console.log(`Batch ${batchNumber}: inserted ${batchInserted} recruiters`);
      }

      const insertProgress = Math.round(70 + (batchNumber / totalBatches) * 25);
      await updateProgress(insertProgress, `Inserting... (batch ${batchNumber}/${totalBatches}, ${insertedCount} added)`, (totalBatches - batchNumber) * 2);
    }

    console.log(`Total inserted: ${insertedCount}, Total skipped: ${skippedCount}`);

    // Finalize log
    if (logId) {
      await supabase
        .from('scraping_logs')
        .update({
          status: errors.length > uniqueRecruiters.length / 2 ? 'partial' : 'completed',
          completed_at: new Date().toISOString(),
          records_found: totalRecordsFound,
          records_added: insertedCount,
          records_skipped: skippedCount,
          errors: errors.length > 0 ? errors : null,
          progress_percent: 100,
          current_phase: 'Completed',
          estimated_completion_at: null,
          metadata: {
            countries: targetCountries,
            queries: customQueries,
            recruiters: uniqueRecruiters.slice(0, 1000).map(r => ({
              name: r.name,
              email: r.email,
              company: r.company,
              domain: r.domain,
              tier: r.tier,
              quality_score: r.quality_score,
            })),
          },
        })
        .eq('id', logId);
    }

    // Update config stats
    if (configId) {
      await supabase
        .from('scraper_config')
        .update({
          last_run_at: new Date().toISOString(),
          last_success_at: insertedCount > 0 ? new Date().toISOString() : undefined,
          last_scrape_count: insertedCount,
        })
        .eq('id', configId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraping completed: ${insertedCount} new recruiters added, ${skippedCount} duplicates skipped`,
        data: {
          records_found: totalRecordsFound,
          records_added: insertedCount,
          records_skipped: skippedCount,
          errors: errors.slice(0, 5),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Scraping error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
