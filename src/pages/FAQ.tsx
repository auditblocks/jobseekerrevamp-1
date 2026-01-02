import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "What is job search automation?",
      answer: "Job search automation is the process of using AI-powered tools to automate repetitive tasks in your job search, such as sending personalized emails to recruiters, tracking applications, and managing follow-ups. JobSeeker helps you automate recruiter outreach with AI-generated personalized emails, saving you hours of manual work."
    },
    {
      question: "How does AI recruiter outreach work?",
      answer: "Our AI-powered job search platform uses advanced algorithms to generate personalized email templates for each recruiter. You can connect your Gmail account, select recruiters from our verified database, and send automated job applications with personalized messages. The platform tracks opens, clicks, and responses automatically."
    },
    {
      question: "Is JobSeeker the best recruiter outreach tool?",
      answer: "JobSeeker is one of the leading job search automation platforms, offering AI-powered email generation, comprehensive recruiter database, real-time analytics, and application tracking. Our platform helps thousands of job seekers automate their job search and land interviews faster."
    },
    {
      question: "How do I automate my job search?",
      answer: "To automate your job search with JobSeeker: 1) Sign up for a free account, 2) Connect your Gmail account securely, 3) Browse our verified recruiter database, 4) Select recruiters and use AI to generate personalized emails, 5) Send automated job applications and track responses. Our platform handles the rest, including follow-up reminders."
    },
    {
      question: "Can I track my job applications?",
      answer: "Yes! JobSeeker includes a comprehensive job application tracker that helps you manage all your applications in one organized dashboard. Track which recruiters you've contacted, monitor email opens and responses, and never miss a follow-up with intelligent reminder suggestions."
    },
    {
      question: "How does the AI email generator work?",
      answer: "Our AI email generator creates personalized, professional emails tailored to your target roles and the specific recruiter you're contacting. Simply provide basic information about your background and the position, and our AI generates compelling email templates that resonate with hiring managers."
    },
    {
      question: "Is my email data secure?",
      answer: "Absolutely. We implement industry-leading security measures to protect your personal information and email communications. Your Gmail account is connected securely using OAuth, and we never store your email password. All data is encrypted and handled according to strict privacy standards."
    },
    {
      question: "What subscription plans are available?",
      answer: "JobSeeker offers Free, Pro, and Pro Max plans. The Free plan includes basic features, while Pro and Pro Max plans offer advanced AI email generation, access to more recruiters, priority support, and enhanced analytics. Choose the plan that best fits your job search needs."
    },
    {
      question: "How do I send personalized recruiter emails?",
      answer: "With JobSeeker, sending personalized recruiter emails is easy. Browse our verified recruiter database, select the recruiters you want to contact, and use our AI email generator to create personalized messages. You can customize the emails further before sending, and the platform tracks all responses automatically."
    },
    {
      question: "Can I use JobSeeker for automated job applications?",
      answer: "Yes! JobSeeker is designed specifically for automated job applications. Our platform helps you send personalized emails to multiple recruiters efficiently, track all your applications, manage conversations, and follow up automatically. It's the complete solution for automating your job search process."
    }
  ];

  // FAQPage Schema for structured data
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      <SEOHead
        title="FAQ - Frequently Asked Questions | JobSeeker"
        description="Frequently asked questions about JobSeeker - AI-powered job search automation, recruiter outreach, automated job applications, and more. Get answers to common questions about our platform."
        keywords="job search automation FAQ, recruiter outreach questions, automated job applications FAQ, job search tool help, AI email generator FAQ"
        canonicalUrl="/faq"
        ogImage="/icon-512.png"
        ogImageAlt="FAQ - JobSeeker"
      />
      <StructuredData 
        type="page" 
        pageTitle="FAQ" 
        pageDescription="Frequently asked questions about JobSeeker"
        pageUrl="/faq"
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

          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <HelpCircle className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Frequently Asked Questions</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Got Questions?{" "}
              <span className="text-accent">We've Got Answers</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know about JobSeeker, job search automation, and how to get the most out of our AI-powered platform.
            </p>
          </motion.div>

          {/* FAQ Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Common Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left font-semibold">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </motion.div>

          {/* Additional Help CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 text-center"
          >
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">
                  Still have questions? We're here to help!
                </p>
                <Button onClick={() => navigate("/contact")}>
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* FAQPage Schema */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>
    </>
  );
};

export default FAQ;

