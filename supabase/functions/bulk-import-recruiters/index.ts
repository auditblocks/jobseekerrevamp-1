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
    const csvSize = csvText.length;
    console.log(`Fetched CSV: ${csvSize} bytes`);
    
    // Parse CSV with proper quote handling
    const rows = parseCSV(csvText);
    
    // Google Sheets CSV export has a limit of ~1000 rows for large sheets
    // Check if CSV might be truncated by looking for incomplete last row
    console.log(`Parsed ${rows.length} rows from CSV (excluding header)`);
    
    // Warn if CSV seems truncated (Google Sheets limits CSV export to ~1000 rows)
    if (rows.length >= 1000) {
      console.warn(`⚠️ CSV export may be truncated. Google Sheets CSV export is limited to approximately 1000 rows.`);
      console.warn(`If your sheet has more than 1000 rows, only the first 1000 will be imported.`);
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

    console.log(`Processing ${rows.length - 1} data rows (excluding header)`);

    // Find column indices from header (case-insensitive)
    const headerRow = rows[0].map((h: string) => h?.toLowerCase().trim() || "");
    const nameIdx = headerRow.indexOf("name");
    const emailIdx = headerRow.indexOf("email");
    const companyIdx = headerRow.indexOf("company");
    const domainIdx = headerRow.indexOf("domain");
    const tierIdx = headerRow.indexOf("tier");
    const qualityScoreIdx = headerRow.indexOf("quality_score");

    // Check if required columns exist in header
    if (emailIdx === -1) {
      console.error("CSV Header columns:", headerRow);
      console.error("Email column not found in CSV. Available columns:", headerRow.join(", "));
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `CSV format error: 'email' column not found in header. Available columns: ${headerRow.join(", ")}. Please ensure your CSV has an 'email' column.`,
          errors: [`Missing 'email' column in CSV header. Found columns: ${headerRow.join(", ")}`]
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Name column is optional - we'll use email username as fallback
    if (nameIdx === -1) {
      console.warn("Name column not found in CSV. Will use email username as name for rows without name.");
    }

    // Assume first row is header, skip it
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip rows with blank email (required field)
      if (!row[emailIdx] || !row[emailIdx].trim()) {
        const errorMsg = `Row ${i + 1}: Skipped - missing email field`;
        errors.push(errorMsg);
        if (errors.length <= 10) { // Log first 10 errors to avoid spam
          console.warn(errorMsg);
        }
        continue; // Skip this row and continue with next
      }

      const email = row[emailIdx].trim();
      
      // Validate email format - skip invalid emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const errorMsg = `Row ${i + 1}: Skipped - invalid email format: ${email}`;
        errors.push(errorMsg);
        if (errors.length <= 10) {
          console.warn(errorMsg);
        }
        continue; // Skip this row and continue with next
      }

      // Name is optional - use email as fallback if name is blank
      const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : "";
      const finalName = name || email.split('@')[0] || "Recruiter"; // Use email username or default
      
      // Log if name was missing (for information, but don't skip)
      if (!name && errors.length <= 10) {
        console.info(`Row ${i + 1}: Name field is blank, using email username as name: ${finalName}`);
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
        name: finalName,
        email,
        company,
        domain,
        tier,
        quality_score: qualityScore,
      });
    }

    console.log(`Validated ${recruiters.length} recruiters from ${rows.length - 1} rows`);
    if (errors.length > 0) {
      console.warn(`Found ${errors.length} validation errors (showing first 10 in logs)`);
    }

    // Only fail if absolutely no valid recruiters found
    if (recruiters.length === 0) {
      console.error("No valid recruiters found after validation");
      const errorMessage = errors.length > 0
        ? `No valid recruiters found. ${errors.length} row${errors.length !== 1 ? 's' : ''} skipped. Most common issue: ${errors[0] || 'Missing email field'}. Please check your CSV format - ensure 'email' column exists and has valid email addresses.`
        : "No valid recruiters found. Please check your CSV format - ensure 'email' column exists and has valid email addresses.";
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          errors: errors.slice(0, 50), // Return first 50 errors
          stats: {
            total_rows: rows.length - 1,
            valid_recruiters: 0,
            skipped: errors.length,
            errors: errors.length,
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log summary of skipped rows
    if (errors.length > 0) {
      console.log(`Skipped ${errors.length} invalid row${errors.length !== 1 ? 's' : ''} out of ${rows.length - 1} total rows`);
      console.log(`Proceeding with ${recruiters.length} valid recruiter${recruiters.length !== 1 ? 's' : ''}`);
    }

    // Get existing emails in batch if skip_duplicates is enabled
    let existingEmails = new Set<string>();
    if (skip_duplicates && recruiters.length > 0) {
      console.log(`Checking for duplicates among ${recruiters.length} recruiters...`);
      const emails = recruiters.map(r => r.email);
      // Fetch existing emails in batches (Supabase has a limit on query size)
      const batchSize = 1000;
      for (let i = 0; i < emails.length; i += batchSize) {
        const emailBatch = emails.slice(i, i + batchSize);
        const { data: existing, error: checkError } = await supabase
          .from("recruiters")
          .select("email")
          .in("email", emailBatch);
        
        if (checkError) {
          console.error(`Error checking duplicates for batch ${i / batchSize + 1}:`, checkError);
        }
        
        if (existing) {
          existing.forEach(e => existingEmails.add(e.email));
        }
      }
      console.log(`Found ${existingEmails.size} existing recruiters (duplicates)`);
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

    console.log(`Inserting ${recruitersToInsert.length} recruiters in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < recruitersToInsert.length; i += BATCH_SIZE) {
      const batch = recruitersToInsert.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recruitersToInsert.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} recruiters)...`);
      
      try {
        const { error: insertError, data: insertData } = await supabase
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
          )
          .select();

        if (insertError) {
          // If batch insert fails, try individual inserts for this batch
          console.warn(`Batch ${batchNum} insert failed:`, insertError.message);
          console.warn(`Trying individual inserts for batch ${batchNum}...`);
          
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
                  console.debug(`Skipped duplicate: ${recruiter.email}`);
                } else {
                  const errorMsg = `${recruiter.email}: ${singleError.message}`;
                  insertErrors.push(errorMsg);
                  if (insertErrors.length <= 10) {
                    console.error(errorMsg);
                  }
                }
              } else {
                inserted++;
              }
            } catch (err: any) {
              const errorMsg = `${recruiter.email}: ${err.message}`;
              insertErrors.push(errorMsg);
              if (insertErrors.length <= 10) {
                console.error(errorMsg);
              }
            }
          }
        } else {
          inserted += batch.length;
          console.log(`Batch ${batchNum} inserted successfully: ${batch.length} recruiters`);
        }
      } catch (err: any) {
        console.error(`Error inserting batch ${batchNum}:`, err);
        insertErrors.push(`Batch ${batchNum}: ${err.message}`);
      }
    }

    console.log(`Import complete: ${inserted} inserted, ${skipped} skipped, ${errors.length + insertErrors.length} errors`);

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

    const totalErrors = errors.length + insertErrors.length;
    const skippedRows = errors.length; // Rows skipped during validation
    
    let warningMessage = "";
    if (rows.length >= 1000) {
      warningMessage = " ⚠️ Note: Google Sheets CSV export is limited to ~1000 rows. If your sheet has more rows, split it into multiple sheets.";
    } else if (skippedRows > 0) {
      warningMessage = ` ⚠️ Note: ${skippedRows} row${skippedRows !== 1 ? 's' : ''} were skipped due to missing email or invalid format.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Import completed: ${inserted} inserted, ${skipped} duplicates skipped, ${skippedRows} invalid rows skipped${warningMessage}`,
        stats: {
          total_rows: rows.length - 1, // Exclude header
          valid_recruiters: recruiters.length,
          inserted,
          skipped, // Duplicates
          skipped_invalid: skippedRows, // Invalid rows (blank/missing fields)
          errors: totalErrors,
        },
        errors: totalErrors > 0 
          ? {
              validation_errors: errors.slice(0, 50), // First 50 validation errors
              insert_errors: insertErrors.slice(0, 50), // First 50 insert errors
              total_count: totalErrors,
              message: totalErrors > 100 ? `Showing first 100 of ${totalErrors} errors. ${skippedRows} rows were skipped due to missing/invalid fields.` : `${skippedRows} rows were skipped due to missing/invalid fields.`
            }
          : undefined,
        warning: rows.length >= 1000 
          ? "Google Sheets CSV export is limited to approximately 1000 rows. Only the first 1000 rows were imported."
          : skippedRows > 0
          ? `${skippedRows} row${skippedRows !== 1 ? 's' : ''} were skipped due to missing email or invalid format. Valid rows were imported successfully.`
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

