import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEOHead from "@/components/SEO/SEOHead";
import StructuredData from "@/components/SEO/StructuredData";
import ResumeUpload from "@/components/resume/ResumeUpload";
import ResumeManager from "@/components/resume/ResumeManager";
import ResumeAnalysis from "@/components/resume/ResumeAnalysis";

const ResumeOptimizer = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upload");

  // Check subscription tier
  const isProUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";

  const handleUploadSuccess = (resume: any) => {
    setSelectedResumeId(resume.id);
    setActiveTab("analyze");
    toast.success("Resume uploaded! You can now analyze it.");
  };

  const handleAnalyze = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setActiveTab("analyze");
  };

  const handleUpgrade = () => {
    navigate("/subscription");
  };

  if (!isProUser) {
    return (
      <>
        <SEOHead
          title="Resume Optimizer | JobSeeker - PRO Feature"
          description="AI-powered resume optimization and ATS score checker. Available for PRO and PRO_MAX subscribers."
          keywords="resume optimizer, ATS score checker, resume analysis, job search tool"
          canonicalUrl="/resume-optimizer"
        />
        <StructuredData
          type="page"
          pageTitle="Resume Optimizer"
          pageDescription="AI-powered resume optimization and ATS score checker"
          pageUrl="/resume-optimizer"
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

            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">Resume Optimizer</CardTitle>
                <CardDescription className="text-base mt-2">
                  AI-Powered ATS Score Checker & Resume Optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    This feature is available for <strong>PRO</strong> and <strong>PRO_MAX</strong> subscribers.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Get instant ATS compatibility scores, keyword matching, and actionable optimization suggestions
                    to improve your resume's chances of passing through applicant tracking systems.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 my-8">
                  <div className="text-center p-4 border rounded-lg">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-accent" />
                    <h3 className="font-semibold mb-1">ATS Score</h3>
                    <p className="text-sm text-muted-foreground">
                      Get a 1-100 compatibility score
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-accent" />
                    <h3 className="font-semibold mb-1">AI Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Detailed optimization suggestions
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-accent" />
                    <h3 className="font-semibold mb-1">Job Matching</h3>
                    <p className="text-sm text-muted-foreground">
                      Compare against job descriptions
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleUpgrade}
                  size="lg"
                  className="w-full"
                >
                  Upgrade to PRO
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Resume Optimizer | JobSeeker - AI-Powered ATS Score Checker"
        description="Optimize your resume with AI-powered ATS compatibility scoring. Get instant feedback, keyword matching, and actionable suggestions to improve your resume."
        keywords="resume optimizer, ATS score checker, resume analysis, job search tool, ATS compatibility"
        canonicalUrl="/resume-optimizer"
      />
      <StructuredData
        type="page"
        pageTitle="Resume Optimizer"
        pageDescription="AI-powered resume optimization and ATS score checker"
        pageUrl="/resume-optimizer"
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Resume Optimizer</h1>
            </div>
            <p className="text-muted-foreground">
              Upload your resume and get instant ATS compatibility scores with AI-powered optimization suggestions
            </p>
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload Resume</TabsTrigger>
              <TabsTrigger value="manage">My Resumes</TabsTrigger>
              <TabsTrigger value="analyze">Analyze</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <ResumeUpload
                onUploadSuccess={handleUploadSuccess}
                setAsActive={false}
              />
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              <ResumeManager
                onAnalyze={handleAnalyze}
                onResumeSelect={(resume) => setSelectedResumeId(resume.id)}
              />
            </TabsContent>

            <TabsContent value="analyze" className="space-y-6">
              <ResumeAnalysis
                resumeId={selectedResumeId}
                onAnalysisComplete={() => {
                  // Refresh resume list if needed
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default ResumeOptimizer;

