import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface WhatsappPayload {
    campaign_id: string;
    // Previously we used recipient_ids (user IDs)
    // Now we accept an array of structured objects
    recipients: {
        user_id?: string;
        phone_number: string;
        name: string;
    }[];
    // Backward compatibility support if frontend sends old format
    recipient_ids?: string[];
    template_name: string;
    template_language: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const payload = await req.json() as WhatsappPayload;

        // Normalize recipients
        let finalRecipients = [];

        if (payload.recipients && payload.recipients.length > 0) {
            // New format with raw data
            finalRecipients = payload.recipients;
        } else if (payload.recipient_ids && payload.recipient_ids.length > 0) {
            // Legacy format: need to fetch from profiles
            const { data: users, error: userError } = await supabaseClient
                .from("profiles")
                .select("id, phone_number, name")
                .in("id", payload.recipient_ids);

            if (userError || !users) {
                throw new Error("Failed to fetch user details");
            }

            finalRecipients = users
                .filter(u => u.phone_number)
                .map(u => ({
                    user_id: u.id,
                    phone_number: u.phone_number,
                    name: u.name
                }));
        } else {
            throw new Error("Missing recipients");
        }

        if (!payload.campaign_id) {
            throw new Error("Missing campaign_id");
        }

        // 2. Update campaign status to 'sending'
        await supabaseClient
            .from("whatsapp_campaigns")
            .update({
                status: "sending",
                started_at: new Date().toISOString()
            })
            .eq("id", payload.campaign_id);

        const META_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
        const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

        if (!META_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
            console.error("Missing WhatsApp credentials");
            throw new Error("Server configuration error: Missing WhatsApp credentials");
        }

        const results = [];
        let sentCount = 0;
        let failedCount = 0;

        // 3. Send messages
        for (const recipient of finalRecipients) {
            try {
                const cleanPhone = recipient.phone_number.replace(/[^0-9]/g, "");

                console.log(`Sending to ${recipient.name} (${cleanPhone})...`);

                const response = await fetch(
                    `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            messaging_product: "whatsapp",
                            to: cleanPhone,
                            type: "template",
                            template: {
                                name: payload.template_name,
                                language: {
                                    code: payload.template_language || "en_US",
                                },
                            },
                        }),
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error?.message || "Unknown Meta API error");
                }

                // Success
                sentCount++;
                results.push({
                    user_id: recipient.user_id || null, // Allow null for guests
                    phone_number: recipient.phone_number,
                    name: recipient.name,
                    status: "sent",
                    message_id: data.messages?.[0]?.id
                });

            } catch (err: any) {
                console.error(`Failed to send to ${recipient.name}:`, err);
                failedCount++;
                results.push({
                    user_id: recipient.user_id || null, // Allow null
                    phone_number: recipient.phone_number,
                    name: recipient.name,
                    status: "failed",
                    error: err.message
                });
            }
        }

        // 4. Update stats in database
        // We assume the rows are already inserted as 'pending' by the frontend?
        // If we support CSV, the frontend might batch insert them first.
        // If not, we should insert logs here.
        // To match previous implementation logic, we'll try to update if exists (by user_id + campaign_id) 
        // OR if we have message_id. 
        // BUT since we now have "CSV guests" who don't have user_ids, we can't easily matching by user_id.
        // The reliable way is: Frontend inserts all recipients with status 'pending' and we update them.
        // HOWEVER, for simplicity (and since `whatsapp_campaign_recipients` ID is not known here), 
        // let's blindly UPDATE based on (campaign_id, phone_number).
        // This assumes phone_number is unique per campaign (reasonable).

        // We will attempt to update status for each result.
        // Since we can't easily batch update with different values without a procedure, loop update is easiest for V1.

        for (const res of results) {
            // Try to update existing record by phone number in this campaign
            // If it doesn't exist (maybe frontend didn't insert it?), we could insert it, 
            // but let's stick to the contract that frontend prepares the DB.

            const { error: updateError } = await supabaseClient
                .from("whatsapp_campaign_recipients")
                .update({
                    status: res.status,
                    message_id: res.message_id,
                    error_details: res.error,
                    updated_at: new Date().toISOString()
                })
                .match({ campaign_id: payload.campaign_id, phone_number: res.phone_number });

            if (updateError) {
                console.error("Failed to update recipient log:", updateError);
            }
        }

        // 5. Update campaign completion stats
        await supabaseClient
            .from("whatsapp_campaigns")
            .update({
                status: failedCount === finalRecipients.length ? "failed" : "completed",
                sent_count: sentCount,
                failed_count: failedCount,
                completed_at: new Date().toISOString()
            })
            .eq("id", payload.campaign_id);

        return new Response(
            JSON.stringify({
                success: true,
                sent: sentCount,
                failed: failedCount
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error("Handler error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            }
        );
    }
});
