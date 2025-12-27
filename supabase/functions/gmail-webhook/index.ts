import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GmailPushNotification {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

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

    // Handle Gmail push notification from Pub/Sub
    const notification: GmailPushNotification = await req.json();
    
    if (!notification.message?.data) {
      console.log("No message data in notification");
      return new Response(JSON.stringify({ message: "No message data" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode the base64 message data
    const messageData = JSON.parse(
      atob(notification.message.data)
    );

    console.log("Gmail push notification:", messageData);

    // Extract email address and historyId from the notification
    const emailAddress = messageData.emailAddress;
    const historyId = messageData.historyId;

    if (!emailAddress) {
      console.log("No email address in notification");
      return new Response(JSON.stringify({ message: "No email address" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user by email address
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, google_refresh_token")
      .eq("email", emailAddress)
      .single();

    if (!profile || !profile.google_refresh_token) {
      console.log("User not found or Gmail not connected:", emailAddress);
      return new Response(JSON.stringify({ message: "User not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh Gmail token
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
      console.error("Failed to refresh token");
      return new Response(JSON.stringify({ error: "Failed to refresh token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Get recent messages (messages received in the last few minutes)
    const messagesResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:inbox is:unread`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!messagesResponse.ok) {
      console.error("Failed to fetch messages");
      return new Response(JSON.stringify({ error: "Failed to fetch messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messagesList = await messagesResponse.json();
    
    if (!messagesList.messages || messagesList.messages.length === 0) {
      console.log("No new messages");
      return new Response(JSON.stringify({ message: "No new messages" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process each message
    for (const msg of messagesList.messages) {
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
      const toHeader = headers.find((h) => h.name.toLowerCase() === "to");

      if (!fromHeader || !subjectHeader) continue;

      // Extract email from "Name <email@domain.com>" or just "email@domain.com"
      const fromEmail = fromHeader.value.match(/<(.+)>/) 
        ? fromHeader.value.match(/<(.+)>/)?.[1] 
        : fromHeader.value.trim();

      if (!fromEmail) continue;

      // Check if this is a reply (not from the user themselves)
      // The user's email should be in the "To" header for sent messages
      // For received messages, the "From" will be different
      const userEmail = emailAddress.toLowerCase();
      const senderEmail = fromEmail.toLowerCase();

      // Skip if it's from the user themselves
      if (senderEmail === userEmail) continue;

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

      // Find or create conversation thread
      let threadId: string;
      const { data: existingThread } = await supabase
        .from("conversation_threads")
        .select("id, total_messages, recruiter_messages_count")
        .eq("user_id", profile.id)
        .eq("recruiter_email", senderEmail)
        .single();

      if (existingThread) {
        threadId = existingThread.id;
        // Update thread
        await supabase
          .from("conversation_threads")
          .update({
            last_activity_at: new Date().toISOString(),
            last_recruiter_message_at: new Date().toISOString(),
            subject_line: subjectHeader.value,
          })
          .eq("id", threadId);
      } else {
        // Get recruiter info if available
        const { data: recruiter } = await supabase
          .from("recruiters")
          .select("name, company")
          .eq("email", senderEmail)
          .single();

        // Extract name from "Name <email>" format
        const recruiterName = fromHeader.value.match(/^(.+?)\s*</)?.[1]?.trim() || recruiter?.name || null;

        // Create new thread
        const { data: newThread, error: threadError } = await supabase
          .from("conversation_threads")
          .insert({
            user_id: profile.id,
            recruiter_email: senderEmail,
            recruiter_name: recruiterName,
            company_name: recruiter?.company || null,
            subject_line: subjectHeader.value,
            status: "active",
            first_contact_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            last_recruiter_message_at: new Date().toISOString(),
            total_messages: 0,
            user_messages_count: 0,
            recruiter_messages_count: 0,
          })
          .select()
          .single();

        if (threadError) {
          console.error("Failed to create conversation thread:", threadError);
          continue;
        } else {
          threadId = newThread.id;
        }
      }

      // Check if message already exists (avoid duplicates)
      // Use internalDate from Gmail message (timestamp in milliseconds)
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
      const messageNumber = (existingThread?.total_messages || 0) + 1;
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
            recruiter_messages_count: (existingThread?.recruiter_messages_count || 0) + 1,
          })
          .eq("id", threadId);

        console.log("Created conversation message for reply from:", senderEmail);
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
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Gmail webhook error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

