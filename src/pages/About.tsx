import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Users, Zap, Shield, Heart, Mail, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";

const About = () => {
  const navigate = useNavigate();

  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We're committed to helping job seekers land their dream roles by democratizing access to professional networking and outreach tools.",
    },
    {
      icon: Users,
      title: "User-Centric",
      description: "Every feature we build is designed with job seekers in mind. Your success is our success, and we're here to support you every step of the way.",
    },
    {
      icon: Zap,
      title: "Innovation First",
      description: "We leverage cutting-edge AI technology to automate tedious tasks, so you can focus on what matters most—building meaningful connections.",
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Your data is yours. We implement industry-leading security measures to protect your personal information and email communications.",
    },
  ];

  const features = [
    {
      title: "AI-Powered Email Generation",
      description: "Our advanced AI creates personalized, professional emails that resonate with recruiters, saving you hours of writing time.",
    },
    {
      title: "Comprehensive Recruiter Database",
      description: "Access thousands of verified recruiters across multiple industries, all organized and ready for outreach.",
    },
    {
      title: "Real-Time Analytics",
      description: "Track your email performance with detailed metrics on opens, clicks, and responses to optimize your outreach strategy.",
    },
    {
      title: "Conversation Management",
      description: "Keep all your recruiter conversations organized in one place, making it easy to follow up and maintain relationships.",
    },
    {
      title: "Application Tracking",
      description: "Never lose track of a job application. Our system helps you manage your entire job search pipeline efficiently.",
    },
    {
      title: "Smart Follow-up Reminders",
      description: "Get intelligent reminders for when to follow up with recruiters, ensuring you never miss an opportunity.",
    },
  ];

  return (
    <>
      <SEOHead
        title="About Us | JobSeeker - AI-Powered Job Search Platform"
        description="Learn about JobSeeker - AI-powered job outreach platform helping job seekers land their dream roles faster through automated, personalized email campaigns. Our mission is to democratize professional networking."
        keywords="about jobseeker, job search platform, AI job search, recruiter outreach tool, job application automation"
        canonicalUrl="/about"
        ogImage="/icon-512.png"
        ogImageAlt="About JobSeeker - AI-Powered Job Search Platform"
      />
      <StructuredData 
        type="page" 
        pageTitle="About Us" 
        pageDescription="Learn about JobSeeker - AI-powered job outreach platform"
        pageUrl="/about"
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">About JobSeeker</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Empowering Job Seekers with{" "}
              <span className="text-accent">AI-Powered Outreach</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're on a mission to revolutionize the job search process by making professional networking and recruiter outreach accessible, efficient, and effective for everyone.
            </p>
          </motion.div>

          {/* Our Story */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Heart className="w-6 h-6 text-accent" />
                  Our Story
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  JobSeeker was born from a simple observation: the job search process is broken. 
                  Talented professionals spend countless hours crafting emails, researching recruiters, 
                  and managing applications, often with little to show for their efforts.
                </p>
                <p>
                  We recognized that the tools needed to succeed in today's competitive job market were 
                  either too expensive, too complex, or simply didn't exist. That's when we decided to 
                  build a solution that would level the playing field.
                </p>
                <p>
                  Today, JobSeeker combines the power of artificial intelligence with intuitive design 
                  to help job seekers automate their outreach, track their progress, and land their 
                  dream roles faster. We've helped thousands of professionals connect with recruiters, 
                  secure interviews, and advance their careers.
                </p>
                <p>
                  Our platform continues to evolve based on user feedback and the changing needs of 
                  the job market. We're committed to being the most trusted partner in your job search journey.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Our Mission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
              <CardHeader>
                <CardTitle className="text-3xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-foreground leading-relaxed">
                  To democratize access to professional networking and job search tools, empowering 
                  every job seeker—regardless of their background or experience—to connect with 
                  opportunities that align with their career goals. We believe that finding the 
                  right job shouldn't be a full-time job itself.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Our Values */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                >
                  <Card className="h-full hover:border-accent/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <value.icon className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            {value.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* What We Offer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">What We Offer</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-3">
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
          </motion.div>

          {/* Technology */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-12"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">Built with Modern Technology</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  JobSeeker is built on a foundation of cutting-edge technology to ensure reliability, 
                  security, and performance:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span><strong className="text-foreground">AI & Machine Learning:</strong> Advanced natural language processing for intelligent email generation and personalization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span><strong className="text-foreground">Secure Infrastructure:</strong> Enterprise-grade security with end-to-end encryption and secure data storage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span><strong className="text-foreground">Real-Time Analytics:</strong> Comprehensive tracking and reporting to help you optimize your outreach strategy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent mt-1">•</span>
                    <span><strong className="text-foreground">Scalable Architecture:</strong> Built to grow with you, handling everything from individual job seekers to enterprise needs</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mb-12"
          >
            <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
              <CardContent className="p-8 text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Ready to Transform Your Job Search?
                </h2>
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Join thousands of job seekers who are already using JobSeeker to land their dream roles. 
                  Start your free trial today and experience the difference AI-powered outreach can make.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    variant="accent"
                    onClick={() => navigate("/auth?mode=signup")}
                  >
                    Get Started Free
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate("/")}
                  >
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Mail className="w-6 h-6 text-accent" />
                  Get in Touch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Have questions, feedback, or suggestions? We'd love to hear from you! 
                  Our team is always here to help and improve your experience.
                </p>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Email:</strong>{" "}
                    <a href="mailto:support@startworking.in" className="text-accent hover:underline">
                      support@startworking.in
                    </a>
                  </p>
                  <p>
                    <strong className="text-foreground">Website:</strong>{" "}
                    <a href="https://startworking.in" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      startworking.in
                    </a>
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    For support inquiries, please visit our{" "}
                    <Link to="/settings" className="text-accent hover:underline">
                      Settings
                    </Link>{" "}
                    page or contact us directly.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default About;

