import { Helmet } from "react-helmet-async";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>JobSeeker - AI-Powered Job Outreach Platform</title>
        <meta 
          name="description" 
          content="Automate your recruiter outreach with AI-generated personalized emails. Track responses, manage conversations, and land your dream job faster." 
        />
      </Helmet>
      
      <main className="min-h-screen">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <FooterSection />
      </main>
    </>
  );
};

export default Index;
