import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, FileText, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ATSScoreGauge from "./ATSScoreGauge";

interface ResumeAnalysisProps {
  resumeId: string | null;
  onAnalysisComplete?: () => void;
}

interface Analysis {
  id: string;
  ats_score: number;
  keyword_match_score: number | null;
  suggestions: any[];
  missing_keywords: string[];
  matched_keywords: string[];
  analysis_data: any;
  created_at: string;
}

const ResumeAnalysis = ({ resumeId, onAnalysisComplete }: ResumeAnalysisProps) => {
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (resumeId) {
      loadLatestAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [resumeId]);

  const loadLatestAnalysis = async () => {
    if (!resumeId) return;

    setLoadingAnalysis(true);
    try {
      const { data, error } = await supabase
        .from("resume_analyses")
        .select("*")
        .eq("resume_id", resumeId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setAnalysis(data);
      }
    } catch (error: any) {
      console.error("Error loading analysis:", error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeId) {
      toast.error("Please select a resume first");
      return;
    }

    setAnalyzing(true);

    try {
      // Get and refresh session to ensure we have a valid token
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        throw new Error("Failed to get session. Please try logging in again.");
      }

      if (!currentSession) {
        throw new Error("Not authenticated. Please log in to continue.");
      }

      // Refresh the session to get a fresh token
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      const session = refreshedSession || currentSession;
      
      if (refreshError) {
        console.warn("Token refresh warning:", refreshError);
        // Continue with current session if refresh fails
      }

      if (!session?.access_token) {
        throw new Error("Invalid session. Please log in again.");
      }

      const response = await supabase.functions.invoke("analyze-resume", {
        body: {
          resume_id: resumeId,
          job_description: jobDescription || null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const { data, error } = response;

      if (error) {
        // Try to extract error message from error object
        let errorMessage = "Failed to analyze resume";
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.error) {
          errorMessage = error.error;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (data?.error) {
          errorMessage = data.error;
        } else if (data?.details) {
          errorMessage = data.details;
        }
        
        console.error("Analyze function error:", { error, data, response });
        throw new Error(errorMessage);
      }

      if (data?.error) {
        throw new Error(data.error || data.details || "Analysis failed");
      }

      if (!data || !data.analysis) {
        throw new Error("Invalid response from server: No analysis data returned");
      }

      toast.success("Resume analyzed successfully!");
      setAnalysis(data.analysis);
      setJobDescription("");
      if (onAnalysisComplete) {
        onAnalysisComplete();
      }
      loadLatestAnalysis();
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze resume");
    } finally {
      setAnalyzing(false);
    }
  };

  if (!resumeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resume Analysis</CardTitle>
          <CardDescription>Select a resume to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-muted-foreground mb-2">
                No resume selected for analysis
              </p>
              <p className="text-sm text-muted-foreground">
                Go to the "My Resumes" tab and click the <strong>"Analyze"</strong> button on any resume to get started.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analyze Resume</CardTitle>
          <CardDescription>
            Get ATS compatibility score and optimization suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-description">
              Job Description (Optional)
            </Label>
            <Textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here to get keyword matching analysis..."
              rows={6}
              disabled={analyzing}
            />
            <p className="text-xs text-muted-foreground">
              Adding a job description will provide keyword matching and job-specific recommendations
            </p>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Resume...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Analyze Resume
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {loadingAnalysis && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {analysis && !loadingAnalysis && (
        <div className="space-y-6">
          <ATSScoreGauge
            score={analysis.ats_score}
            showDetails={true}
            formattingScore={analysis.analysis_data?.formatting_score}
            keywordScore={analysis.analysis_data?.keyword_score}
            sectionsScore={analysis.analysis_data?.sections_score}
            structureScore={analysis.analysis_data?.structure_score}
          />

          {analysis.keyword_match_score !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Keyword Match Score</CardTitle>
                <CardDescription>
                  How well your resume matches the job description
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-accent mb-2">
                    {analysis.keyword_match_score}%
                  </div>
                  <p className="text-sm text-muted-foreground">Keyword Match</p>
                </div>

                {analysis.matched_keywords.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Matched Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.matched_keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="default">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.missing_keywords.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      Missing Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missing_keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Optimization Suggestions</CardTitle>
                <CardDescription>
                  Actionable recommendations to improve your ATS score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {analysis.suggestions.map((suggestion: any, idx: number) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2 text-left">
                          <Badge
                            variant={
                              suggestion.priority === "high"
                                ? "destructive"
                                : suggestion.priority === "medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {suggestion.priority}
                          </Badge>
                          <span>{suggestion.category}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <p className="text-sm">{suggestion.suggestion}</p>
                          {suggestion.impact && (
                            <p className="text-xs text-muted-foreground">
                              <strong>Impact:</strong> {suggestion.impact}
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {analysis.analysis_data?.strengths && analysis.analysis_data.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Resume Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.analysis_data.strengths.map((strength: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.analysis_data?.weaknesses && analysis.analysis_data.weaknesses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.analysis_data.weaknesses.map((weakness: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeAnalysis;

