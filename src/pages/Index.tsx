import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DataUsageSection from "@/components/landing/DataUsageSection";
import PricingSection from "@/components/landing/PricingSection";
import FooterSection from "@/components/landing/FooterSection";
import ContactSection from "@/components/landing/ContactSection";
import GovtJobCTA from "@/components/landing/GovtJobCTA";
import BlogPreviewSection from "@/components/landing/BlogPreviewSection";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";

import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const HOME_PATHS = new Set(["/", "/pricing"]);

const Index = () => {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (!HOME_PATHS.has(pathname)) return;
    if (hash) return;
    if (pathname === "/pricing") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  useEffect(() => {
    const handleScroll = () => {
      let targetId = "";

      if (pathname === "/pricing") {
        targetId = "pricing";
      } else if (hash) {
        targetId = hash.replace(/^#/, "");
      }

      if (!targetId) return;

      const attemptScroll = (retryCount = 0) => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (retryCount < 30) {
          setTimeout(() => attemptScroll(retryCount + 1), 100);
        }
      };
      attemptScroll();
    };

    handleScroll();
  }, [pathname, hash]);

  return (
    <>
      <SEOHead
        title="JobSeeker - AI Job Search & Outreach Platform"
        description="Streamline job outreach with AI-powered recruiter emails, response tracking, and application management—all in one place. Tools to organize your search; outcomes depend on your profile and market."
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
        <GovtJobCTA />
        <BlogPreviewSection />
        <DataUsageSection />
        <PricingSection />
        <ContactSection />
        <FooterSection />
      </main>
    </>
  );
};

export default Index;
