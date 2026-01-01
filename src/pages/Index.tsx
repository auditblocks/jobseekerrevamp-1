import { Helmet } from "react-helmet-async";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DataUsageSection from "@/components/landing/DataUsageSection";
import PricingSection from "@/components/landing/PricingSection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>JobSeeker - AI-Powered Job Outreach Platform</title>
        <meta 
          name="description" 
          content="Automate your recruiter outreach with AI-generated personalized emails. Track responses, manage conversations, and land your dream job faster. Connect your Gmail account securely to send emails and track recruiter replies." 
        />
      </Helmet>
      
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
