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
    if (!isProUser) {
      toast.error("Please upgrade to PRO or PRO_MAX to upload and analyze resumes");
      navigate("/subscription");
      return;
    }
    setSelectedResumeId(resume.id);
    setActiveTab("analyze");
    toast.success("Resume uploaded! You can now analyze it.");
  };

  const handleAnalyze = (resumeId: string) => {
    if (!isProUser) {
      toast.error("Please upgrade to PRO or PRO_MAX to analyze resumes");
      navigate("/subscription");
      return;
    }
    setSelectedResumeId(resumeId);
    setActiveTab("analyze");
  };

  const handleUpgrade = () => {
    navigate("/subscription");
  };

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
              {!isProUser && (
                <Card className="border-accent/50 bg-accent/5 mb-4">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-6 h-6 text-accent" />
                      <div>
                        <h3 className="font-semibold">Upgrade Required</h3>
                        <p className="text-sm text-muted-foreground">
                          Upload and analyze resumes with AI-powered ATS scoring
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleUpgrade} className="w-full sm:w-auto">
                      Upgrade to PRO
                    </Button>
                  </CardContent>
                </Card>
              )}
              <ResumeUpload
                onUploadSuccess={handleUploadSuccess}
                setAsActive={false}
                disabled={!isProUser}
              />
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              {!isProUser && (
                <Card className="border-accent/50 bg-accent/5 mb-4">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-6 h-6 text-accent" />
                      <div>
                        <h3 className="font-semibold">Upgrade Required</h3>
                        <p className="text-sm text-muted-foreground">
                          Manage and analyze your resumes with PRO features
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleUpgrade} className="w-full sm:w-auto">
                      Upgrade to PRO
                    </Button>
                  </CardContent>
                </Card>
              )}
              <ResumeManager
                onAnalyze={handleAnalyze}
                onResumeSelect={(resume) => setSelectedResumeId(resume.id)}
              />
            </TabsContent>

            <TabsContent value="analyze" className="space-y-6">
              {!isProUser && (
                <Card className="border-accent/50 bg-accent/5 mb-4">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Sparkles className="w-6 h-6 text-accent" />
                      <div>
                        <h3 className="font-semibold">Upgrade Required</h3>
                        <p className="text-sm text-muted-foreground">
                          Get AI-powered ATS score analysis and optimization suggestions
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleUpgrade} className="w-full sm:w-auto">
                      Upgrade to PRO
                    </Button>
                  </CardContent>
                </Card>
              )}
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

