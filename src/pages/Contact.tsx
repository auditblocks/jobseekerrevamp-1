import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";
import { ContactSupportForm } from "@/components/ContactSupportForm";
import { useAuth } from "@/hooks/useAuth";

const Contact = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const defaultName = (profile?.name as string | undefined)?.trim() || "";
  const defaultEmail = user?.email?.trim() || (profile?.email as string | undefined)?.trim() || "";

  return (
    <>
      <SEOHead
        title="Contact Us | JobSeeker - Get Support & Help"
        description="Get in touch with JobSeeker. We're here to help with any questions or support you need about our AI-powered job search automation platform."
        keywords="contact jobseeker, job search support, job application help, recruiter outreach support"
        canonicalUrl="/contact"
        ogImage="/icon-512.png"
        ogImageAlt="Contact JobSeeker - AI-Powered Job Search Platform"
      />
      <StructuredData
        type="page"
        pageTitle="Contact Us"
        pageDescription="Get in touch with JobSeeker for support and questions"
        pageUrl="/contact"
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 sm:py-16 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Mail className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Get in Touch</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have a question or need help? Fill out the form below—all fields are required. We typically respond within 24
              hours on business days.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Send us a message</CardTitle>
                <CardDescription>We typically respond within 24 hours during business days.</CardDescription>
              </CardHeader>
              <CardContent>
                <ContactSupportForm
                  source="contact_page"
                  defaultName={defaultName}
                  defaultEmail={defaultEmail}
                  variant="default"
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 sm:mt-12"
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="font-semibold text-foreground mb-2">Email support</h3>
                    <p className="text-muted-foreground mb-2">For direct inquiries, you can email us at:</p>
                    <a href="mailto:support@startworking.in" className="text-accent hover:underline font-medium">
                      support@startworking.in
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Contact;
