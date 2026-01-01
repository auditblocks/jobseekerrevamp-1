import { motion } from "framer-motion";
import { Shield, Mail, Eye, Lock, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";

const DataUsageSection = () => {
  return (
    <section className="py-12 sm:py-24 bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-card rounded-2xl p-6 sm:p-8 md:p-12 border border-border shadow-lg">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Transparent Data Usage
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  We believe in complete transparency about how we use your data
                </p>
              </div>
            </div>

            {/* Gmail Integration Explanation */}
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-accent" />
                  Gmail Account Connection
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When you connect your Gmail account to JobSeeker, we request access to your Gmail account for the following specific purposes:
                </p>
                <ul className="space-y-3 mb-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-accent text-sm font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Sending Emails on Your Behalf</p>
                      <p className="text-sm text-muted-foreground">
                        We use your Gmail account to send personalized emails to recruiters that you select. This allows us to send emails directly from your email address, maintaining authenticity and improving deliverability.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-accent text-sm font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Tracking Recruiter Replies</p>
                      <p className="text-sm text-muted-foreground">
                        We read emails in your inbox to identify and track replies from recruiters. This helps us organize your conversations and notify you when recruiters respond to your outreach.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-accent text-sm font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Managing Job Application Conversations</p>
                      <p className="text-sm text-muted-foreground">
                        We organize and display your email conversations with recruiters in our platform, making it easy for you to track your job application progress and follow up effectively.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Important Notice */}
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground mb-2">What We Don't Do</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We only access emails related to your job search activities. We <strong>do not</strong> read, store, or process your personal emails unrelated to job applications. Your privacy is our priority, and we use industry-standard security measures to protect your data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Control & Privacy */}
              <div className="bg-secondary/50 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground mb-2">You're in Control</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      You can disconnect your Gmail account at any time through your account settings. When you disconnect, we immediately stop accessing your Gmail account and remove stored access tokens.
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <Link 
                        to="/privacy-policy" 
                        className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Read Our Privacy Policy
                      </Link>
                      <Link 
                        to="/terms-of-service" 
                        className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                      >
                        <LinkIcon className="w-4 h-4" />
                        View Terms of Service
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="pt-6 border-t border-border">
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                By using JobSeeker, you agree to our data usage practices as described in our{" "}
                <Link to="/privacy-policy" className="text-accent hover:underline font-medium">
                  Privacy Policy
                </Link>
                {" "}and{" "}
                <Link to="/terms-of-service" className="text-accent hover:underline font-medium">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DataUsageSection;

