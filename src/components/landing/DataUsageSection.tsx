import { motion } from "framer-motion";
import { Shield, Mail, Eye, Lock, CheckCircle2, XCircle, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DataUsageSection = () => {
  const features = [
    {
      icon: <Mail className="w-6 h-6 text-blue-500" />,
      title: "Sending Emails",
      description: "We send personalized emails to recruiters directly from your address, ensuring authenticity and high deliverability.",
      color: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      icon: <CheckCircle2 className="w-6 h-6 text-green-500" />,
      title: "Tracking Replies",
      description: "We monitor your inbox to detect recruiter responses, helping you stay on top of every potential opportunity.",
      color: "bg-green-500/10",
      borderColor: "border-green-500/20"
    },
    {
      icon: <Shield className="w-6 h-6 text-purple-500" />,
      title: "Managing Applications",
      description: "We organize your conversations into a clear dashboard, so you can track progress without the inbox clutter.",
      color: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    }
  ];

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-background to-secondary/30 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-blue-500/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-purple-500/5 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium mb-4"
            >
              <Shield className="w-4 h-4" />
              <span>Privacy First</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground"
            >
              Transparent Data Usage
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              We believe trust is built on transparency. Here's exactly how we interact with your Gmail account to power your job search.
            </motion.p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-muted/40 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 sm:p-8">
                    <div className={`w-14 h-14 rounded-2xl ${feature.color} ${feature.borderColor} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Bottom Section: Privacy & Control */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* What We Don't Do */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-red-500/20 bg-red-500/5 overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-red-500/10 text-red-600">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">Whatever We Don't Do</h3>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        We respect your personal boundaries. We <strong>never</strong> access, read, or store personal emails unrelated to your job applications.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-700 text-xs font-medium border border-red-500/10">
                          <XCircle className="w-3.5 h-3.5" /> No Personal Email Access
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-700 text-xs font-medium border border-red-500/10">
                          <XCircle className="w-3.5 h-3.5" /> No Data Selling
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* You're in Control */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-primary/20 bg-primary/5 overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-foreground">You're in Control</h3>
                      <p className="text-muted-foreground leading-relaxed mb-6">
                        Disconnect your Gmail account instantly at any lime. We immediately delete all access tokens and stored data upon disconnection.
                      </p>
                      <div className="flex gap-4">
                        <Link to="/privacy-policy">
                          <Button variant="link" className="p-0 h-auto font-medium text-primary hover:text-primary/80 group">
                            Privacy Policy <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                        <Link to="/terms-of-service">
                          <Button variant="link" className="p-0 h-auto font-medium text-primary hover:text-primary/80 group">
                            Terms of Service <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataUsageSection;

