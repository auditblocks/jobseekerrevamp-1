import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DataUsageSection from "@/components/landing/DataUsageSection";
import PricingSection from "@/components/landing/PricingSection";
import FooterSection from "@/components/landing/FooterSection";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";

const Index = () => {
  return (
    <>
      <SEOHead
        title="JobSeeker - AI Job Search & Outreach Platform"
        description="Automate your job search with AI-powered recruiter outreach. Send personalized emails, track responses, and manage applications to land your dream job faster."
        keywords="job search automation, AI recruiter outreach, automated job applications, recruiter email tool, job search platform, AI-powered job search, job application tracker, personalized recruiter emails, best job search tool"
        canonicalUrl="/"
        ogImage="/icon-512.png"
        ogImageAlt="JobSeeker - AI-Powered Job Outreach Platform for Job Seekers"
        datePublished="2025-01-01T00:00:00+00:00"
        dateModified={new Date().toISOString()}
      />
      <StructuredData type="homepage" />

      <main className="min-h-screen">
        <HeroSection />
        <FeaturesSection />
        <DataUsageSection />
        <PricingSection />
        <FooterSection />
      </main>
    </>
  );
};

export default Index;
