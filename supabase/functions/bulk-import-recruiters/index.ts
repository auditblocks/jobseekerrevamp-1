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

    // Check if user is superadmin
    const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_superadmin");
    
    if (adminCheckError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
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
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    // Fetch CSV data
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch sheet: ${csvResponse.statusText}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvText = await csvResponse.text();
    
    // Parse CSV with proper quote handling
    const rows = parseCSV(csvText);
    
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
          error: "No valid recruiters found",
          errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert recruiters
    let inserted = 0;
    let skipped = 0;
    const insertErrors: string[] = [];

    for (const recruiter of recruiters) {
      try {
        if (skip_duplicates) {
          // Check if email already exists
          const { data: existing } = await supabase
            .from("recruiters")
            .select("id")
            .eq("email", recruiter.email)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }
        }

        const { error: insertError } = await supabase
          .from("recruiters")
          .insert({
            name: recruiter.name,
            email: recruiter.email,
            company: recruiter.company || null,
            domain: recruiter.domain || null,
            tier: recruiter.tier || "FREE",
            quality_score: recruiter.quality_score || null,
          });

        if (insertError) {
          if (insertError.code === "23505") { // Unique constraint violation
            skipped++;
          } else {
            insertErrors.push(`${recruiter.email}: ${insertError.message}`);
          }
        } else {
          inserted++;
        }
      } catch (err: any) {
        insertErrors.push(`${recruiter.email}: ${err.message}`);
      }
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

