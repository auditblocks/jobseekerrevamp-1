import { motion } from "framer-motion";
import { Mail, BarChart3, Users, Zap, Shield, Clock, Sparkles, Target } from "lucide-react";

const features = [
  {
    icon: Mail,
    title: "Smart Email Campaigns",
    description: "Send personalized emails to recruiters with AI-generated content that resonates.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track opens, clicks, and responses with detailed engagement metrics.",
    color: "bg-success/10 text-success",
  },
  {
    icon: Users,
    title: "Recruiter Database",
    description: "Access thousands of verified recruiters across multiple industries.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Templates",
    description: "Generate compelling email templates tailored to your target roles.",
    color: "bg-warning/10 text-warning",
  },
  {
    icon: Target,
    title: "Application Tracking",
    description: "Keep track of all your job applications in one organized dashboard.",
    color: "bg-destructive/10 text-destructive",
  },
  {
    icon: Clock,
    title: "Follow-up Reminders",
    description: "Never miss a follow-up with intelligent reminder suggestions.",
    color: "bg-accent/10 text-accent",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
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
            Everything You Need to{" "}
            <span className="text-accent">Succeed</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our comprehensive suite of tools helps you streamline your job search 
            and maximize your chances of landing interviews.
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
