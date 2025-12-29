import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Privacy Policy | Job Seeker AI</title>
        <meta name="description" content="Privacy Policy for Job Seeker AI - Learn how we protect your personal information" />
      </Helmet>

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
                <CardTitle className="text-3xl">Privacy Policy</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </CardHeader>
              <CardContent className="prose prose-slate max-w-none">
                <div className="space-y-6 text-sm leading-relaxed">
                  <section>
                    <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                    <p>
                      Welcome to Job Seeker AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our job search and email management services.
                    </p>
                    <p>
                      By using our services, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
                    
                    <h3 className="text-xl font-semibold mb-3 mt-4">2.1 Personal Information</h3>
                    <p>We collect information that you provide directly to us, including:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Name, email address, and contact information</li>
                      <li>Professional information (job title, work experience, skills)</li>
                      <li>Resume and portfolio information</li>
                      <li>Profile photo and bio</li>
                      <li>Payment information (processed securely through third-party providers)</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Gmail Account Information</h3>
                    <p>When you connect your Gmail account, we access:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Email sending capabilities (to send emails on your behalf)</li>
                      <li>Email reading capabilities (to track recruiter replies and manage conversations)</li>
                      <li>Gmail refresh tokens (stored securely for maintaining your connection)</li>
                    </ul>
                    <p className="mt-2">
                      <strong>Important:</strong> We only access emails related to your job search activities. We do not read, store, or process your personal emails unrelated to job applications.
                    </p>

                    <h3 className="text-xl font-semibold mb-3 mt-4">2.3 Usage Information</h3>
                    <p>We automatically collect certain information when you use our services:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Device information (browser type, operating system)</li>
                      <li>IP address and location data</li>
                      <li>Usage patterns and interactions with our platform</li>
                      <li>Email tracking data (opens, clicks, replies)</li>
                      <li>Analytics data to improve our services</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
                    <p>We use the collected information for the following purposes:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Service Delivery:</strong> To provide, maintain, and improve our job search and email management services</li>
                      <li><strong>Email Management:</strong> To send emails to recruiters, track responses, and manage conversations</li>
                      <li><strong>Personalization:</strong> To customize your experience and provide relevant job opportunities</li>
                      <li><strong>Communication:</strong> To send you service updates, notifications, and support responses</li>
                      <li><strong>Analytics:</strong> To analyze usage patterns and improve our platform</li>
                      <li><strong>Security:</strong> To protect against fraud, unauthorized access, and other security threats</li>
                      <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
                    <p>We do not sell your personal information. We may share your information only in the following circumstances:</p>
                    
                    <h3 className="text-xl font-semibold mb-3 mt-4">4.1 Service Providers</h3>
                    <p>We may share information with third-party service providers who perform services on our behalf, including:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Email service providers (Gmail API, Resend)</li>
                      <li>Cloud hosting and storage providers (Supabase, Netlify)</li>
                      <li>Payment processors (Razorpay)</li>
                      <li>Analytics providers</li>
                    </ul>
                    <p className="mt-2">These providers are contractually obligated to protect your information and use it only for the purposes we specify.</p>

                    <h3 className="text-xl font-semibold mb-3 mt-4">4.2 Legal Requirements</h3>
                    <p>We may disclose your information if required by law or in response to valid legal requests, such as:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Court orders or subpoenas</li>
                      <li>Government investigations</li>
                      <li>Protection of our rights and safety</li>
                    </ul>

                    <h3 className="text-xl font-semibold mb-3 mt-4">4.3 Business Transfers</h3>
                    <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
                    <p>We implement industry-standard security measures to protect your information:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Encryption of data in transit and at rest</li>
                      <li>Secure authentication and authorization</li>
                      <li>Regular security audits and updates</li>
                      <li>Access controls and monitoring</li>
                      <li>Secure storage of sensitive credentials</li>
                    </ul>
                    <p className="mt-2">
                      However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
                    <p>You have the following rights regarding your personal information:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Access:</strong> Request access to your personal information</li>
                      <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                      <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                      <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
                      <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                      <li><strong>Gmail Disconnection:</strong> Disconnect your Gmail account at any time</li>
                    </ul>
                    <p className="mt-2">
                      To exercise these rights, please contact us at <a href="mailto:audicblocks@gmail.com" className="text-primary hover:underline">audicblocks@gmail.com</a>.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking Technologies</h2>
                    <p>We use cookies and similar tracking technologies to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Maintain your session and authentication</li>
                      <li>Remember your preferences</li>
                      <li>Analyze usage patterns</li>
                      <li>Track email opens and clicks</li>
                    </ul>
                    <p className="mt-2">
                      You can control cookies through your browser settings. However, disabling cookies may limit your ability to use certain features of our service.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
                    <p>
                      Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
                    <p>
                      Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using our services, you consent to the transfer of your information to these countries.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">10. Data Retention</h2>
                    <p>
                      We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal or regulatory purposes.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
                    <p>
                      We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
                    <p>
                      If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
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

export default PrivacyPolicy;

