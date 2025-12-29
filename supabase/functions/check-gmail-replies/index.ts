import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{
      mimeType: string;
      body: { data?: string; size?: number };
      parts?: Array<{
        mimeType: string;
        body: { data?: string; size?: number };
      }>;
    }>;
    body?: { data?: string; size?: number };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    // Get all users with Gmail connected
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, google_refresh_token")
      .not("google_refresh_token", "is", null);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users with Gmail connected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processedCount = 0;
    let errorCount = 0;

    // Process each user
    for (const profile of profiles) {
      try {
        // Refresh token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: profile.google_refresh_token,
            grant_type: "refresh_token",
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error(`Failed to refresh token for user ${profile.id}:`, errorText);
          console.error(`Token response status: ${tokenResponse.status}`);
          errorCount++;
          continue;
        }

        const tokens = await tokenResponse.json();
        const accessToken = tokens.access_token;

        // Get unread messages from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const query = `is:inbox is:unread after:${Math.floor(yesterday.getTime() / 1000)}`;

        const messagesResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!messagesResponse.ok) {
          console.error(`Failed to fetch messages for user ${profile.id}`);
          errorCount++;
          continue;
        }

        const messagesList = await messagesResponse.json();
        
        if (!messagesList.messages || messagesList.messages.length === 0) {
          continue;
        }

        // Process each message
        for (const msg of messagesList.messages) {
          try {
            // Get full message details
            const messageResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (!messageResponse.ok) continue;

            const message: GmailMessage = await messageResponse.json();

            // Extract headers
            const headers = message.payload.headers;
            const fromHeader = headers.find((h) => h.name.toLowerCase() === "from");
            const subjectHeader = headers.find((h) => h.name.toLowerCase() === "subject");
            const inReplyToHeader = headers.find((h) => h.name.toLowerCase() === "in-reply-to");
            const referencesHeader = headers.find((h) => h.name.toLowerCase() === "references");

            if (!fromHeader || !subjectHeader) continue;

            // Extract email from "Name <email@domain.com>" or just "email@domain.com"
            const fromEmail = fromHeader.value.match(/<(.+)>/) 
              ? fromHeader.value.match(/<(.+)>/)?.[1] 
              : fromHeader.value.trim();

            if (!fromEmail) continue;

            // Check if this is a reply (not from the user themselves)
            const userEmail = profile.email.toLowerCase();
            const senderEmail = fromEmail.toLowerCase();

            // Skip if it's from the user themselves
            if (senderEmail === userEmail) continue;

            // IMPORTANT: Only process emails if a conversation thread already exists
            // This ensures we only show replies to emails sent through the app
            const { data: existingThread } = await supabase
              .from("conversation_threads")
              .select("id, total_messages, recruiter_messages_count")
              .eq("user_id", profile.id)
              .eq("recruiter_email", senderEmail)
              .single();

            // Skip if no thread exists - this means the user never sent an email to this recruiter
            if (!existingThread) {
              console.log(`Skipping email from ${senderEmail} - no existing conversation thread`);
              continue;
            }

            // Additional check: Verify this is actually a reply
            // Check if subject contains "Re:" or if it's part of a Gmail thread
            const isReply = subjectHeader.value.toLowerCase().startsWith("re:") || 
                            inReplyToHeader || 
                            referencesHeader;

            if (!isReply) {
              console.log(`Skipping email from ${senderEmail} - not a reply`);
              continue;
            }

            // Extract message body
            let bodyText = "";
            let bodyHtml = "";

            const extractBody = (part: any): void => {
              if (part.body?.data) {
                const decoded = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
                if (part.mimeType === "text/plain") {
                  bodyText += decoded;
                } else if (part.mimeType === "text/html") {
                  bodyHtml += decoded;
                }
              }
              if (part.parts) {
                part.parts.forEach(extractBody);
              }
            };

            if (message.payload.parts) {
              message.payload.parts.forEach(extractBody);
            } else if (message.payload.body?.data) {
              const decoded = atob(message.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
              if (message.payload.mimeType === "text/plain") {
                bodyText = decoded;
              } else if (message.payload.mimeType === "text/html") {
                bodyHtml = decoded;
              }
            }

            const bodyContent = bodyText || bodyHtml || message.snippet;

            // Use existing thread (we already verified it exists above)
            const threadId = existingThread.id;
            
            // Update thread
            await supabase
              .from("conversation_threads")
              .update({
                last_activity_at: new Date().toISOString(),
                last_recruiter_message_at: new Date().toISOString(),
                subject_line: subjectHeader.value,
              })
              .eq("id", threadId);

            // Check if message already exists (avoid duplicates)
            const sentAt = message.internalDate 
              ? new Date(parseInt(message.internalDate)).toISOString()
              : new Date().toISOString();
            
            // Check for existing message by Gmail message ID stored in metadata
            const { data: existingMessage } = await supabase
              .from("conversation_messages")
              .select("id")
              .eq("thread_id", threadId)
              .eq("metadata->>gmail_message_id", message.id)
              .single();

            if (existingMessage) {
              console.log("Message already exists, skipping");
              continue;
            }

            // Create conversation message
            const messageNumber = (existingThread.total_messages || 0) + 1;
            const { error: messageError } = await supabase
              .from("conversation_messages")
              .insert({
                thread_id: threadId,
                sender_type: "recruiter",
                subject: subjectHeader.value,
                body_preview: bodyContent.substring(0, 200),
                body_full: bodyContent,
                sent_at: sentAt,
                message_number: messageNumber,
                status: "delivered",
                metadata: {
                  gmail_message_id: message.id,
                  gmail_thread_id: message.threadId,
                },
              });

            if (messageError) {
              console.error("Failed to create conversation message:", messageError);
            } else {
              // Update thread message counts
              await supabase
                .from("conversation_threads")
                .update({
                  total_messages: messageNumber,
                  recruiter_messages_count: (existingThread.recruiter_messages_count || 0) + 1,
                })
                .eq("id", threadId);

              processedCount++;
              console.log(`Created conversation message for reply from: ${senderEmail}`);
            }

            // Mark message as read in Gmail to avoid processing again
            await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  removeLabelIds: ["UNREAD"],
                }),
              }
            );
          } catch (error) {
            console.error(`Error processing message ${msg.id}:`, error);
            errorCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error);
        errorCount++;
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        users_checked: profiles.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Polling error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

