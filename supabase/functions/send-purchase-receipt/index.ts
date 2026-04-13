/**
 * @module send-purchase-receipt
 * @description Supabase Edge Function that generates and sends a branded HTML
 * purchase receipt email after a successful payment. Supports two receipt types
 * via `receipt_kind`:
 *   - **subscription** (default) — includes plan duration, purchase/expiry dates.
 *   - **ats** — one-time ATS resume scan purchase (no expiry section).
 *
 * Email transport priority:
 *   1. SMTP (if `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are configured) — preferred
 *      for deliverability control.
 *   2. Resend API (fallback via `RESEND_API_KEY`).
 *
 * Called internally by `verify-razorpay-payment` in fire-and-forget mode.
 *
 * @requires SMTP_HOST | RESEND_API_KEY  (at least one email transport)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import nodemailer from "npm:nodemailer@6.9.15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReceiptKind = "subscription" | "ats";

interface ReceiptRequest {
  user_id: string;
  user_email: string;
  user_name: string;
  plan_name: string;
  plan_display_name: string | null;
  amount: number; // In rupees (999 = ₹999)
  order_id: string;
  payment_id: string;
  purchase_date: string; // ISO string
  expiry_date: string; // ISO string
  duration_days: number;
  /** Default subscription — use "ats" for one-time ATS scan receipts */
  receipt_kind?: ReceiptKind;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}`;
}

/** Strips HTML tags and style blocks for the text/plain MIME alternative. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveSiteUrl(): string {
  const raw = Deno.env.get("SITE_URL")?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://startworking.in";
}

function resolveDashboardUrl(): string {
  return `${resolveSiteUrl()}/dashboard`;
}

function smtpConfigured(): boolean {
  return Boolean(
    Deno.env.get("SMTP_HOST")?.trim() &&
      Deno.env.get("SMTP_USER")?.trim() &&
      Deno.env.get("SMTP_PASS")?.trim(),
  );
}

async function sendEmailSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const host = Deno.env.get("SMTP_HOST")!.trim();
  const user = Deno.env.get("SMTP_USER")!.trim();
  const pass = Deno.env.get("SMTP_PASS")!.trim();
  const port = Number(Deno.env.get("SMTP_PORT")?.trim() || "465");
  const fromRaw =
    Deno.env.get("SMTP_FROM")?.trim() || `"StartWorking" <support@startworking.in>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(port === 587 ? { requireTLS: true } : {}),
  });

  await transporter.sendMail({
    from: fromRaw,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    replyTo: "support@startworking.in",
  });
}

async function sendEmailResend(opts: {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
}): Promise<void> {
  const resend = new Resend(opts.apiKey);
  await resend.emails.send({
    from: "StartWorking <support@startworking.in>",
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    reply_to: "support@startworking.in",
  });
}

/**
 * Builds the full HTML receipt email. Renders different detail blocks depending
 * on whether this is a subscription purchase or a one-time ATS scan.
 */
function generateReceiptHTML(
  data: ReceiptRequest,
  invoiceNumber: string,
  dashboardUrl: string,
): string {
  const formattedAmount = formatCurrency(data.amount);
  const purchaseDate = formatDateTime(data.purchase_date);
  const expiryDate = formatDate(data.expiry_date);
  const planDisplayName = data.plan_display_name || data.plan_name;
  const kind: ReceiptKind = data.receipt_kind ?? "subscription";
  const isAts = kind === "ats";

  const subscriptionBlock = isAts
    ? `
          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 20px; font-weight: 600;">Service details</h2>
              <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.6;">
                One-time <strong>ATS resume scan</strong>. Open the Resume Optimizer in your account to view your report.
              </p>
            </td>
          </tr>`
    : `
          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 20px; font-weight: 600;">Subscription Details</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Purchase Date</p>
                    <p style="margin: 5px 0 0 0; color: #333333; font-size: 14px;">${purchaseDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Expiry Date</p>
                    <p style="margin: 5px 0 0 0; color: #333333; font-size: 14px;">${expiryDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Payment Successful</h1>
              <div style="margin-top: 20px; font-size: 48px; color: #ffffff;">✓</div>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 30px 20px 30px; background-color: #ffffff;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding-bottom: 10px;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Invoice Number</p>
                    <p style="margin: 5px 0 0 0; color: #333333; font-size: 18px; font-weight: 600;">${invoiceNumber}</p>
                  </td>
                  <td align="right" style="padding-bottom: 10px;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Purchase Date</p>
                    <p style="margin: 5px 0 0 0; color: #333333; font-size: 14px;">${purchaseDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px; font-weight: 600;">Order Summary</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">${isAts ? "Product" : "Plan"}</p>
                  </td>
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">
                    <p style="margin: 0; color: #333333; font-size: 14px; font-weight: 600;">${planDisplayName}</p>
                  </td>
                </tr>
                ${
    isAts
      ? ""
      : `<tr>
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Duration</p>
                  </td>
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">
                    <p style="margin: 0; color: #333333; font-size: 14px;">${data.duration_days} days</p>
                  </td>
                </tr>`
  }
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #333333; font-size: 16px; font-weight: 600;">Total Amount</p>
                  </td>
                  <td style="padding: 15px; text-align: right;">
                    <p style="margin: 0; color: #667eea; font-size: 20px; font-weight: 700;">${formattedAmount}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 20px; font-weight: 600;">Customer Information</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Name</p>
                    <p style="margin: 5px 0 0 0; color: #333333; font-size: 14px;">${data.user_name}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Email</p>
                    <p style="margin: 5px 0 0 0; color: #333333; font-size: 14px;">${data.user_email}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 20px; font-weight: 600;">Payment Details</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Razorpay Order ID</p>
                    <p style="margin: 5px 0 0 0; color: #333333; font-size: 14px; font-family: monospace;">${data.order_id}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Razorpay Payment ID</p>
                    <p style="margin: 5px 0 0 0; color: #333333; font-size: 14px; font-family: monospace;">${data.payment_id}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${subscriptionBlock}

          <tr>
            <td style="padding: 0 30px 40px 30px; background-color: #ffffff; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Go to Dashboard</a>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} StartWorking (startworking.in). All rights reserved.</p>
              <p style="margin: 0; color: #666666; font-size: 12px;">
                Need help? Contact us at <a href="mailto:support@startworking.in" style="color: #667eea; text-decoration: none;">support@startworking.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const receiptData = await req.json() as ReceiptRequest;

    if (!receiptData.user_email || !receiptData.order_id || !receiptData.payment_id) {
      throw new Error("Missing required receipt data");
    }

    const invoiceNumber = generateInvoiceNumber();
    const dashboardUrl = resolveDashboardUrl();
    const emailHTML = generateReceiptHTML(receiptData, invoiceNumber, dashboardUrl);
    const subject =
      `Payment Receipt - ${invoiceNumber} - ${receiptData.plan_display_name || receiptData.plan_name}`;
    const plainText = htmlToPlainText(emailHTML);

    // Prefer SMTP for full deliverability control; fall back to Resend SaaS API
    if (smtpConfigured()) {
      await sendEmailSmtp({
        to: receiptData.user_email,
        subject,
        html: emailHTML,
        text: plainText,
      });
      console.log("Receipt email sent via SMTP:", { invoiceNumber, to: receiptData.user_email });
    } else {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        throw new Error(
          "Configure SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) or RESEND_API_KEY for receipts",
        );
      }
      await sendEmailResend({
        to: receiptData.user_email,
        subject,
        html: emailHTML,
        apiKey: resendApiKey,
      });
      console.log("Receipt email sent via Resend (fallback):", { invoiceNumber, to: receiptData.user_email });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Receipt email sent successfully",
        invoice_number: invoiceNumber,
        transport: smtpConfigured() ? "smtp" : "resend",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    console.error("Error sending receipt email:", error);
    return new Response(
      JSON.stringify({
        error: err.message || "Failed to send receipt email",
        details: err.stack,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
