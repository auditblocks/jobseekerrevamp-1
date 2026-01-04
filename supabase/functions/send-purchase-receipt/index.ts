import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function generateReceiptHTML(data: ReceiptRequest, invoiceNumber: string, dashboardUrl: string): string {
  const formattedAmount = formatCurrency(data.amount);
  const purchaseDate = formatDateTime(data.purchase_date);
  const expiryDate = formatDate(data.expiry_date);
  const planDisplayName = data.plan_display_name || data.plan_name;

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
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Payment Successful</h1>
              <div style="margin-top: 20px; font-size: 48px; color: #ffffff;">✓</div>
            </td>
          </tr>

          <!-- Invoice Number and Date -->
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

          <!-- Order Summary Table -->
          <tr>
            <td style="padding: 0 30px 30px 30px; background-color: #ffffff;">
              <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px; font-weight: 600;">Order Summary</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Plan</p>
                  </td>
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">
                    <p style="margin: 0; color: #333333; font-size: 14px; font-weight: 600;">${planDisplayName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #666666; font-size: 14px; font-weight: 500;">Duration</p>
                  </td>
                  <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: right;">
                    <p style="margin: 0; color: #333333; font-size: 14px;">${data.duration_days} days</p>
                  </td>
                </tr>
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

          <!-- Customer Information -->
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

          <!-- Payment Details -->
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

          <!-- Subscription Dates -->
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
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 40px 30px; background-color: #ffffff; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Go to Dashboard</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px;">© ${new Date().getFullYear()} JobSeeker. All rights reserved.</p>
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL not configured");
    }

    const receiptData: ReceiptRequest = await req.json();

    // Validate required fields
    if (!receiptData.user_email || !receiptData.order_id || !receiptData.payment_id) {
      throw new Error("Missing required receipt data");
    }

    const resend = new Resend(resendApiKey);
    const invoiceNumber = generateInvoiceNumber();
    const dashboardUrl = supabaseUrl.replace('/functions/v1', '').replace('/rest/v1', '') + '/dashboard';

    const emailHTML = generateReceiptHTML(receiptData, invoiceNumber, dashboardUrl);

    const fromAddress = "JobSeeker <hello@startworking.in>";
    const replyToEmail = "support@startworking.in";

    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: [receiptData.user_email],
      subject: `Payment Receipt - ${invoiceNumber} - ${receiptData.plan_display_name || receiptData.plan_name}`,
      html: emailHTML,
      reply_to: replyToEmail,
    });

    console.log("Receipt email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Receipt email sent successfully",
        invoice_number: invoiceNumber,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending receipt email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send receipt email",
        details: error.stack 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

