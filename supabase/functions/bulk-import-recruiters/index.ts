import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkImportRequest {
  sheet_url: string;
  skip_duplicates?: boolean;
}

interface RecruiterRow {
  name: string;
  email: string;
  company?: string;
  domain?: string;
  tier?: string;
  quality_score?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is superadmin by checking user_roles and profiles tables
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const hasAdminRole = !!roleData;
    const hasSuperadminProfile = profileData?.role === 'superadmin';
    
    if (!hasAdminRole && !hasSuperadminProfile) {
      console.error(`User ${user.id} (${user.email}) attempted bulk import but is not an admin`);
      return new Response(
        JSON.stringify({ 
          error: "Forbidden: Admin access required",
          details: "You must be an admin to perform bulk imports"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sheet_url, skip_duplicates = true }: BulkImportRequest = await req.json();

    if (!sheet_url) {
      return new Response(
        JSON.stringify({ error: "sheet_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract sheet ID from Google Sheets URL
    // Supports formats:
    // https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
    // https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0
    const sheetIdMatch = sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return new Response(
        JSON.stringify({ error: "Invalid Google Sheets URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sheetId = sheetIdMatch[1];
    // Try to get all rows - Google Sheets CSV export might have limits
    // Use gid=0 to get the first sheet, or you can specify a specific sheet
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

    // Fetch CSV data
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch sheet: ${csvResponse.statusText}. Make sure the sheet is publicly accessible.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvText = await csvResponse.text();
    
    // Parse CSV with proper quote handling
    const rows = parseCSV(csvText);
    
    // Check if CSV was truncated (Google Sheets might limit CSV exports to ~10,000 rows)
    // Note: Google Sheets CSV export typically supports up to 10,000 rows
    if (rows.length > 0) {
      console.log(`Parsed ${rows.length} rows from CSV`);
    }
    
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Sheet is empty or has no data rows" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map CSV rows to recruiter data
    const recruiters: RecruiterRow[] = [];
    const errors: string[] = [];

    // Assume first row is header, skip it
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Find column indices (case-insensitive)
      const headerRow = rows[0].map((h: string) => h?.toLowerCase().trim() || "");
      const nameIdx = headerRow.indexOf("name");
      const emailIdx = headerRow.indexOf("email");
      const companyIdx = headerRow.indexOf("company");
      const domainIdx = headerRow.indexOf("domain");
      const tierIdx = headerRow.indexOf("tier");
      const qualityScoreIdx = headerRow.indexOf("quality_score");

      if (emailIdx === -1 || !row[emailIdx]) {
        errors.push(`Row ${i + 1}: Missing required email field`);
        continue;
      }

      const email = row[emailIdx].trim();
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Row ${i + 1}: Invalid email format: ${email}`);
        continue;
      }

      const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : "";
      if (!name) {
        errors.push(`Row ${i + 1}: Missing required name field`);
        continue;
      }

      const company = companyIdx !== -1 && row[companyIdx] ? row[companyIdx].trim() : undefined;
      const domain = domainIdx !== -1 && row[domainIdx] ? row[domainIdx].trim() : undefined;
      
      // Normalize tier
      let tier: string | undefined = undefined;
      if (tierIdx !== -1 && row[tierIdx]) {
        const tierValue = row[tierIdx].trim().toUpperCase();
        if (["FREE", "PRO", "PRO_MAX"].includes(tierValue)) {
          tier = tierValue;
        } else {
          tier = "FREE"; // Default to FREE if invalid
        }
      }

      // Parse quality_score
      let qualityScore: number | undefined = undefined;
      if (qualityScoreIdx !== -1 && row[qualityScoreIdx]) {
        const score = parseFloat(row[qualityScoreIdx].trim());
        if (!isNaN(score) && score >= 0 && score <= 100) {
          qualityScore = score;
        }
      }

      recruiters.push({
        name,
        email,
        company,
        domain,
        tier,
        quality_score: qualityScore,
      });
    }

    if (recruiters.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "No valid recruiters found",
          errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing emails in batch if skip_duplicates is enabled
    let existingEmails = new Set<string>();
    if (skip_duplicates && recruiters.length > 0) {
      const emails = recruiters.map(r => r.email);
      // Fetch existing emails in batches (Supabase has a limit on query size)
      const batchSize = 1000;
      for (let i = 0; i < emails.length; i += batchSize) {
        const emailBatch = emails.slice(i, i + batchSize);
        const { data: existing } = await supabase
          .from("recruiters")
          .select("email")
          .in("email", emailBatch);
        
        if (existing) {
          existing.forEach(e => existingEmails.add(e.email));
        }
      }
    }

    // Filter out duplicates before inserting
    const recruitersToInsert = skip_duplicates
      ? recruiters.filter(r => !existingEmails.has(r.email))
      : recruiters;
    
    const skipped = skip_duplicates ? recruiters.length - recruitersToInsert.length : 0;

    // Insert recruiters in batches for better performance
    let inserted = 0;
    const insertErrors: string[] = [];
    const BATCH_SIZE = 100; // Insert 100 at a time

    for (let i = 0; i < recruitersToInsert.length; i += BATCH_SIZE) {
      const batch = recruitersToInsert.slice(i, i + BATCH_SIZE);
      
      try {
        const { error: insertError } = await supabase
          .from("recruiters")
          .insert(
            batch.map(recruiter => ({
              name: recruiter.name,
              email: recruiter.email,
              company: recruiter.company || null,
              domain: recruiter.domain || null,
              tier: recruiter.tier || "FREE",
              quality_score: recruiter.quality_score || null,
            }))
          );

        if (insertError) {
          // If batch insert fails, try individual inserts for this batch
          console.warn(`Batch insert failed, trying individual inserts for batch ${i / BATCH_SIZE + 1}`);
          for (const recruiter of batch) {
            try {
              const { error: singleError } = await supabase
                .from("recruiters")
                .insert({
                  name: recruiter.name,
                  email: recruiter.email,
                  company: recruiter.company || null,
                  domain: recruiter.domain || null,
                  tier: recruiter.tier || "FREE",
                  quality_score: recruiter.quality_score || null,
                });

              if (singleError) {
                if (singleError.code === "23505") { // Unique constraint violation
                  // Already counted in skipped
                } else {
                  insertErrors.push(`${recruiter.email}: ${singleError.message}`);
                }
              } else {
                inserted++;
              }
            } catch (err: any) {
              insertErrors.push(`${recruiter.email}: ${err.message}`);
            }
          }
        } else {
          inserted += batch.length;
        }
      } catch (err: any) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, err);
        insertErrors.push(`Batch ${i / BATCH_SIZE + 1}: ${err.message}`);
      }
    }

    // If nothing was inserted and nothing was skipped, it's an error
    if (inserted === 0 && skipped === 0 && recruiters.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to import any recruiters. All rows had errors.",
          stats: {
            total_rows: rows.length - 1,
            valid_recruiters: recruiters.length,
            inserted: 0,
            skipped: 0,
            errors: errors.length + insertErrors.length,
          },
          errors: [...errors, ...insertErrors],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Import completed: ${inserted} inserted, ${skipped} skipped`,
        stats: {
          total_rows: rows.length - 1, // Exclude header
          valid_recruiters: recruiters.length,
          inserted,
          skipped,
          errors: errors.length + insertErrors.length,
        },
        errors: errors.length > 0 || insertErrors.length > 0 
          ? [...errors, ...insertErrors] 
          : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in bulk-import-recruiters:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString() 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// CSV parser with proper quote handling
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Row separator
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      }
      // Skip \r\n combination
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }

  // Add last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

