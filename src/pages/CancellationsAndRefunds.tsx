/**
 * @file CancellationsAndRefunds.tsx
 * @description Static legal page: cancellation, issue-based refund policy (7-day
 * guarantee for qualifying issues only), post–7-day review, free plan, timelines. noindex.
 */

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";

/** Cancellations & Refunds page component. Renders refund policy content. */
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
                      <li>
                        Ordinary cancellation does not entitle you to a refund for unused time; see Section 2 for when refunds
                        may still apply (for example, billing errors or unresolved technical issues)
                      </li>
                      <li>After cancellation, your account will automatically revert to the FREE tier</li>
                      <li>You can resubscribe at any time to regain PRO features</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">2. Refund Policy</h2>
                    <p className="text-muted-foreground mb-4">
                      Refunds are <strong className="text-foreground">not</strong> issued for general dissatisfaction,
                      change of mind, or deciding that you no longer wish to use a paid plan. They are considered{" "}
                      <strong className="text-foreground">only</strong> when there is a verifiable problem with our service,
                      platform availability, or your billing, as defined in Section 2.1 below. If none of those grounds applies,
                      <strong className="text-foreground"> no refund will be provided.</strong> Our free plan exists so you can
                      evaluate the product before subscribing; upgrading is optional.
                    </p>

                    <h3 className="text-xl font-semibold mb-3">2.1 Qualifying issues (only bases for a refund)</h3>
                    <p className="text-muted-foreground mb-4">
                      We may approve a refund only after we can reasonably verify that one of the following{" "}
                      <strong className="text-foreground">qualifying issues</strong> occurred:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>
                        <strong className="text-foreground">Unresolved technical issues:</strong> a defect or fault on our
                        side prevents you from materially using the paid service, and our support team cannot resolve it within a
                        reasonable time despite your cooperation
                      </li>
                      <li>
                        <strong className="text-foreground">Duplicate or incorrect billing:</strong> you were charged more than
                        once for the same period, charged the wrong amount, or charged for a plan or add-on you did not authorize
                      </li>
                      <li>
                        <strong className="text-foreground">Unauthorized transaction:</strong> a charge you did not authorize
                        (subject to investigation and any payment-provider or card-network rules)
                      </li>
                      <li>
                        <strong className="text-foreground">Extended platform downtime:</strong> the paid service was
                        unavailable due to our infrastructure or platform for more than 48 consecutive hours (excluding scheduled
                        maintenance announced in advance, issues on your device or network, third-party outages outside our
                        control, or force majeure)
                      </li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Seven-day money-back guarantee (new subscriptions)</h3>
                    <p className="text-muted-foreground mb-4">
                      For your <strong className="text-foreground">first</strong> paid subscription only, we operate a{" "}
                      <strong className="text-foreground">seven (7) calendar day money-back guarantee</strong> that applies{" "}
                      <strong className="text-foreground">solely</strong> when a qualifying issue in Section 2.1 affected you
                      during that seven-day period. It is <strong className="text-foreground">not</strong> a trial of paid
                      features for subjective preference, and it is <strong className="text-foreground">not</strong> a
                      &quot;satisfaction&quot; or change-of-mind policy.
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>You must contact us within seven (7) days of the initial subscription charge and describe the qualifying issue with enough detail for us to investigate</li>
                      <li>If we confirm a qualifying issue, we may issue a full refund to the original payment method where possible</li>
                      <li>Refunds are typically processed within 5-10 business days after approval</li>
                      <li>Once a refund is processed, the related paid subscription is cancelled</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Qualifying issues reported after the seven-day period</h3>
                    <p className="text-muted-foreground mb-4">
                      If a qualifying issue in Section 2.1 arises or is reported after the seven-day window in Section 2.2, we
                      may still review a refund request in good faith. Approval, timing, and amount (full or partial) depend on
                      verification, our logs, and the nature of the issue. This does not create an open-ended right to a refund
                      absent a qualifying issue.
                    </p>
                    <p className="text-muted-foreground">
                      Contact support with dates, screenshots, and transaction or order IDs to assist verification.
                    </p>

                    <h3 className="text-xl font-semibold mb-3 mt-6">2.4 When a refund is not available</h3>
                    <p className="text-muted-foreground mb-4">
                      The following are <strong className="text-foreground">not</strong> qualifying issues and{" "}
                      <strong className="text-foreground">do not</strong> entitle you to a refund, including within the first
                      seven days:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                      <li>
                        Preferring not to continue a paid plan, no longer needing paid features, or deciding the product is not
                        for you, where the service and billing are working as described
                      </li>
                      <li>Expectations about outcomes (for example, interviews or job offers) that we do not guarantee</li>
                      <li>Prorated or partial refunds for unused subscription time when no qualifying issue applies</li>
                      <li>Resume analysis credits or one-time purchases, except where a Section 2.1 billing or access issue is verified</li>
                      <li>Requests where use of the service violated our Terms of Service</li>
                    </ul>
                    <p className="text-muted-foreground mt-4">
                      JobSeeker offers a <strong className="text-foreground">free plan</strong> so you can use and assess the
                      service before paying. There is no obligation to subscribe; if you do not wish to pay, remain on or return
                      to the free plan and cancel renewal before the next charge.
                    </p>
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
                      <li>
                        Renewal charges are not refundable for change of mind after renewal; they may still be refundable only
                        if a qualifying issue in Section 2.1 is verified (for example, duplicate charge or unauthorized
                        transaction)
                      </li>
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

