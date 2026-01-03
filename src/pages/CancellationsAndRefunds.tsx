import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";

const CancellationsAndRefunds = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Cancellations and Refunds | JobSeeker - Refund Policy"
        description="Cancellations and Refunds Policy for JobSeeker - Learn about our cancellation process, refund eligibility, and subscription management policies."
        keywords="cancellation policy, refund policy, subscription cancellation, money back guarantee, refund process"
        canonicalUrl="/cancellations-and-refunds"
        ogImage="/icon-512.png"
        ogImageAlt="Cancellations and Refunds - JobSeeker"
        noindex={true}
      />
      <StructuredData 
        type="page" 
        pageTitle="Cancellations and Refunds" 
        pageDescription="Cancellations and Refunds Policy for JobSeeker - Learn about our cancellation and refund process"
        pageUrl="/cancellations-and-refunds"
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">Cancellations and Refunds</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <div className="space-y-6">
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">1. Subscription Cancellation</h2>
                    <p className="text-muted-foreground mb-4">
                      You may cancel your subscription at any time through your account settings or by contacting our support team. 
                      Cancellation will take effect at the end of your current billing period.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>You will continue to have access to all PRO features until the end of your paid period</li>
                      <li>No partial refunds are provided for the unused portion of your subscription</li>
                      <li>After cancellation, your account will automatically revert to the FREE tier</li>
                      <li>You can resubscribe at any time to regain PRO features</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">2. Refund Policy</h2>
                    <h3 className="text-xl font-semibold mb-3">2.1 Money-Back Guarantee</h3>
                    <p className="text-muted-foreground mb-4">
                      We offer a 7-day money-back guarantee for new subscriptions. If you are not satisfied with our service 
                      within the first 7 days of your subscription, you may request a full refund.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Refund requests must be made within 7 days of the initial subscription purchase</li>
                      <li>Refunds are processed within 5-10 business days</li>
                      <li>Refunds will be issued to the original payment method</li>
                      <li>Once a refund is processed, your subscription will be immediately cancelled</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Refund Eligibility</h3>
                    <p className="text-muted-foreground mb-4">
                      Refunds may be considered in the following circumstances:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Technical issues that prevent you from using the service and cannot be resolved by our support team</li>
                      <li>Duplicate charges or billing errors</li>
                      <li>Unauthorized transactions on your account</li>
                      <li>Service unavailability for an extended period (more than 48 hours)</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Non-Refundable Items</h3>
                    <p className="text-muted-foreground mb-4">
                      The following are not eligible for refunds:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Subscriptions cancelled after the 7-day money-back guarantee period</li>
                      <li>Partial refunds for unused subscription time</li>
                      <li>Resume analysis credits or one-time purchases (unless covered by guarantee)</li>
                      <li>Refunds requested due to violation of our Terms of Service</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">3. How to Request a Refund</h2>
                    <p className="text-muted-foreground mb-4">
                      To request a refund, please follow these steps:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                      <li>Log in to your JobSeeker account</li>
                      <li>Navigate to Settings → Subscription</li>
                      <li>Click on "Request Refund" or contact our support team at support@startworking.in</li>
                      <li>Provide your subscription details and reason for refund</li>
                      <li>Our team will review your request within 2-3 business days</li>
                    </ol>
                    <p className="text-muted-foreground mt-4">
                      For faster processing, please include your order number or transaction ID in your refund request.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">4. Processing Time</h2>
                    <p className="text-muted-foreground mb-4">
                      Refund processing times vary by payment method:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li><strong>Credit/Debit Cards:</strong> 5-10 business days</li>
                      <li><strong>PayPal:</strong> 3-5 business days</li>
                      <li><strong>Bank Transfer:</strong> 7-14 business days</li>
                      <li><strong>Razorpay:</strong> 5-7 business days</li>
                    </ul>
                    <p className="text-muted-foreground mt-4">
                      Processing times may vary depending on your financial institution. You will receive an email confirmation 
                      once your refund has been processed.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">5. Subscription Renewal</h2>
                    <p className="text-muted-foreground mb-4">
                      Subscriptions automatically renew at the end of each billing period unless cancelled. You will be charged 
                      the subscription fee on the renewal date.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>You will receive an email reminder 3 days before your subscription renews</li>
                      <li>To prevent renewal, cancel your subscription before the renewal date</li>
                      <li>Renewal charges are non-refundable after the 7-day guarantee period</li>
                      <li>You can change your subscription plan at any time</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">6. Chargebacks</h2>
                    <p className="text-muted-foreground mb-4">
                      If you initiate a chargeback or dispute a charge with your payment provider, your account may be 
                      suspended or terminated. We encourage you to contact our support team first to resolve any billing 
                      issues before initiating a chargeback.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
                    <p className="text-muted-foreground mb-4">
                      If you have questions about cancellations or refunds, please contact us:
                    </p>
                    <ul className="list-none space-y-2 text-muted-foreground">
                      <li><strong>Email:</strong> support@startworking.in</li>
                      <li><strong>Response Time:</strong> Within 24-48 hours</li>
                      <li><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM IST</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
                    <p className="text-muted-foreground mb-4">
                      We reserve the right to modify this Cancellations and Refunds Policy at any time. Changes will be 
                      effective immediately upon posting on this page. We will notify users of any material changes via 
                      email or through our platform.
                    </p>
                    <p className="text-muted-foreground">
                      Your continued use of our service after any changes constitutes acceptance of the updated policy.
                    </p>
                  </section>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CancellationsAndRefunds;

