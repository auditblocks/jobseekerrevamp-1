import { motion } from "framer-motion";
import { Mail, BarChart3, Users, Zap, Shield, Clock, Sparkles, Target } from "lucide-react";

const features = [
  {
    icon: Mail,
    title: "AI-Powered Recruiter Outreach",
    description: "Automate job search with personalized recruiter emails using AI-generated content that resonates with hiring managers.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: BarChart3,
    title: "Job Search Analytics",
    description: "Track email opens, clicks, and recruiter responses with detailed engagement metrics for your job application campaigns.",
    color: "bg-success/10 text-success",
  },
  {
    icon: Users,
    title: "Verified Recruiter Database",
    description: "Access thousands of verified recruiters across multiple industries for automated job applications and outreach.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Sparkles,
    title: "AI Email Generator",
    description: "Generate compelling, personalized email templates tailored to your target roles and job search goals.",
    color: "bg-warning/10 text-warning",
  },
  {
    icon: Target,
    title: "Job Application Tracker",
    description: "Keep track of all your job applications in one organized dashboard with automated application management.",
    color: "bg-destructive/10 text-destructive",
  },
  {
    icon: Clock,
    title: "Smart Follow-up Automation",
    description: "Never miss a follow-up with intelligent reminder suggestions for your recruiter outreach campaigns.",
    color: "bg-accent/10 text-accent",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-12 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Powerful Features</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Complete Job Search Automation{" "}
            <span className="text-accent">Platform</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our comprehensive suite of job search automation tools helps you streamline recruiter outreach,
            automate job applications, and maximize your chances of landing interviews with AI-powered email campaigns.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className="bg-card rounded-2xl p-6 border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-lg h-full">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>

                {/* Hover Gradient */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-secondary border border-border">
            <Shield className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">
              Trusted by <span className="font-semibold text-foreground">10,000+</span> job seekers worldwide
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
