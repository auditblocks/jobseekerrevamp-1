import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Terms of Service | JobSeeker - Terms & Conditions"
        description="Terms of Service for JobSeeker - Read our terms and conditions for using our AI-powered job search automation platform."
        keywords="terms of service, terms and conditions, job search platform terms, user agreement"
        canonicalUrl="/terms-of-service"
        ogImage="/icon-512.png"
        ogImageAlt="Terms of Service - JobSeeker"
        noindex={true}
      />
      <StructuredData 
        type="page" 
        pageTitle="Terms of Service" 
        pageDescription="Terms of Service for JobSeeker - Read our terms and conditions"
        pageUrl="/terms-of-service"
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
                <CardTitle className="text-3xl">Terms of Service</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </CardHeader>
              <CardContent className="prose prose-slate max-w-none">
                <div className="space-y-6 text-sm leading-relaxed">
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                    <p>
                      By accessing and using Job Seeker AI ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                    </p>
                    <p>
                      These Terms of Service ("Terms") govern your access to and use of our website, services, and applications (collectively, the "Service") provided by Job Seeker AI ("we," "us," or "our").
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                    <p>Job Seeker AI provides a platform that enables users to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Manage job applications and track recruiter communications</li>
                      <li>Send personalized emails to recruiters</li>
                      <li>Track email opens, clicks, and responses</li>
                      <li>Organize conversations with recruiters</li>
                      <li>Access AI-powered email generation and follow-up suggestions</li>
                      <li>Manage professional profiles and resumes</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
                    
                    <h3 className="text-xl font-semibold mb-3 mt-4">3.1 Account Creation</h3>
                    <p>To use our Service, you must:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Be at least 18 years old</li>
                      <li>Provide accurate, current, and complete information</li>
                      <li>Maintain and update your information to keep it accurate</li>
                      <li>Maintain the security of your account credentials</li>
                      <li>Accept responsibility for all activities under your account</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Account Security</h3>
                    <p>
                      You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">4. Gmail Integration and Email Services</h2>
                    
                    <h3 className="text-xl font-semibold mb-3 mt-4">4.1 Gmail Connection</h3>
                    <p>
                      By connecting your Gmail account, you authorize us to access and use your Gmail account for the following purposes:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Sending emails to recruiters on your behalf</li>
                      <li>Reading emails to track recruiter replies</li>
                      <li>Managing email conversations related to job applications</li>
                    </ul>
                    <p className="mt-2">
                      You can disconnect your Gmail account at any time through your account settings.
                    </p>

                    <h3 className="text-xl font-semibold mb-3 mt-4">4.2 Email Content and Responsibility</h3>
                    <p>
                      You are solely responsible for the content of emails sent through our Service. You agree not to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Send spam, unsolicited, or illegal emails</li>
                      <li>Send emails containing malicious content, viruses, or malware</li>
                      <li>Impersonate others or misrepresent your identity</li>
                      <li>Violate any applicable laws or regulations</li>
                      <li>Send emails that infringe on intellectual property rights</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">5. Subscription Plans and Payment</h2>
                    
                    <h3 className="text-xl font-semibold mb-3 mt-4">5.1 Subscription Tiers</h3>
                    <p>We offer the following subscription plans:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>FREE:</strong> Limited features and email sending capacity</li>
                      <li><strong>PRO:</strong> Enhanced features and higher email limits</li>
                      <li><strong>PRO_MAX:</strong> Maximum features and unlimited email capacity</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Payment Terms</h3>
                    <p>
                      By subscribing to a paid plan, you agree to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Pay all fees associated with your subscription</li>
                      <li>Provide accurate payment information</li>
                      <li>Authorize us to charge your payment method</li>
                      <li>Accept that fees are non-refundable except as required by law</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-4">5.3 Billing and Renewal</h3>
                    <p>
                      Subscriptions automatically renew unless cancelled. You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">6. Acceptable Use Policy</h2>
                    <p>You agree not to use the Service to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Violate any applicable laws, regulations, or third-party rights</li>
                      <li>Send spam, phishing emails, or unsolicited communications</li>
                      <li>Harass, abuse, or harm others</li>
                      <li>Interfere with or disrupt the Service or servers</li>
                      <li>Attempt to gain unauthorized access to any part of the Service</li>
                      <li>Use automated systems to access the Service without permission</li>
                      <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                      <li>Collect or harvest information about other users</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property Rights</h2>
                    
                    <h3 className="text-xl font-semibold mb-3 mt-4">7.1 Our Rights</h3>
                    <p>
                      The Service, including all content, features, and functionality, is owned by Job Seeker AI and is protected by international copyright, trademark, and other intellectual property laws.
                    </p>

                    <h3 className="text-xl font-semibold mb-3 mt-4">7.2 Your Content</h3>
                    <p>
                      You retain ownership of any content you submit, post, or display on the Service. By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content solely for the purpose of providing and improving the Service.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">8. AI-Generated Content</h2>
                    <p>
                      Our Service uses artificial intelligence to generate email content and suggestions. You acknowledge that:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>AI-generated content is provided as a tool and suggestion only</li>
                      <li>You are responsible for reviewing and editing all AI-generated content</li>
                      <li>We do not guarantee the accuracy, completeness, or suitability of AI-generated content</li>
                      <li>You should verify all information before sending emails</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">9. Service Availability and Modifications</h2>
                    <p>
                      We reserve the right to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Modify, suspend, or discontinue any part of the Service at any time</li>
                      <li>Update features, functionality, or pricing</li>
                      <li>Perform maintenance that may temporarily interrupt service</li>
                      <li>Limit access to the Service for any reason</li>
                    </ul>
                    <p className="mt-2">
                      We will make reasonable efforts to notify you of significant changes, but we are not obligated to do so.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
                    <p>
                      TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOB SEEKER AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Loss of profits, data, or business opportunities</li>
                      <li>Email delivery failures or delays</li>
                      <li>Inability to access or use the Service</li>
                      <li>Errors or omissions in content</li>
                      <li>Third-party actions or content</li>
                    </ul>
                    <p className="mt-2">
                      Our total liability for any claims arising from or related to the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
                    <p>
                      You agree to indemnify, defend, and hold harmless Job Seeker AI and its officers, directors, employees, and agents from and against any claims, damages, obligations, losses, liabilities, costs, or expenses (including attorney's fees) arising from:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Your use of the Service</li>
                      <li>Your violation of these Terms</li>
                      <li>Your violation of any third-party rights</li>
                      <li>Content you submit or transmit through the Service</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
                    
                    <h3 className="text-xl font-semibold mb-3 mt-4">12.1 Termination by You</h3>
                    <p>
                      You may terminate your account at any time by contacting us or using the account deletion feature in your settings.
                    </p>

                    <h3 className="text-xl font-semibold mb-3 mt-4">12.2 Termination by Us</h3>
                    <p>
                      We may suspend or terminate your account immediately if you:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Violate these Terms or our policies</li>
                      <li>Engage in fraudulent or illegal activity</li>
                      <li>Fail to pay required fees</li>
                      <li>Misuse the Service in any way</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-4">12.3 Effect of Termination</h3>
                    <p>
                      Upon termination, your right to use the Service will immediately cease. We may delete your account and data, subject to our data retention policies and legal obligations.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">13. Dispute Resolution</h2>
                    <p>
                      Any disputes arising from or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the applicable arbitration organization. You waive your right to a jury trial and to participate in a class action lawsuit.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
                    <p>
                      These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Job Seeker AI operates, without regard to its conflict of law provisions.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
                    <p>
                      We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">16. Severability</h2>
                    <p>
                      If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">17. Entire Agreement</h2>
                    <p>
                      These Terms, together with our Privacy Policy, constitute the entire agreement between you and Job Seeker AI regarding the Service and supersede all prior agreements and understandings.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">18. Contact Information</h2>
                    <p>
                      If you have any questions about these Terms, please contact us:
                    </p>
                    <div className="mt-4 space-y-2">
                      <p><strong>Email:</strong> <a href="mailto:audicblocks@gmail.com" className="text-primary hover:underline">audicblocks@gmail.com</a></p>
                      <p><strong>Website:</strong> <a href="https://startworking.in" className="text-primary hover:underline">https://startworking.in</a></p>
                    </div>
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

export default TermsOfService;

