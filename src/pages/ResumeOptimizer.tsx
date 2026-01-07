import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  FileText, 
  Sparkles, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  FileSearch,
  IndianRupee,
  Clock,
  TrendingUp,
  Wand2,
  Download,
  Check,
  X,
  Palette
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SEOHead from "@/components/SEO/SEOHead";
import { ResumeTemplates } from "@/components/resume/ResumeTemplates";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface AnalysisResult {
  id: string;
  ats_score: number;
  analysis_result: any;
  keyword_match_score: number;
  missing_keywords: string[];
  matched_keywords: string[];
  created_at: string;
  payment_status: string;
  formatting_analysis?: {
    layout_type?: string;
    sidebar_color?: string;
    font_family?: string;
    section_spacing?: string;
    design_style?: string;
  };
  formatting_preservation?: {
    sections?: string[];
    styling?: {
      colors?: string[];
      fonts?: string[];
      layout?: string;
    };
  };
}

interface ScanSettings {
  amount: number;
  currency: string;
}

const ResumeOptimizer = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scanPrice, setScanPrice] = useState<number>(99);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResume, setOptimizedResume] = useState<string | null>(null);
  const [showOptimized, setShowOptimized] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [originalFileType, setOriginalFileType] = useState<'pdf' | 'docx' | 'txt' | null>(null);

  const isProUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Fetch scan price
  useEffect(() => {
    const fetchScanPrice = async () => {
      const { data, error } = await supabase
        .from("ats_scan_settings")
        .select("setting_value")
        .eq("setting_key", "scan_price")
        .single();

      if (!error && data?.setting_value) {
        const settings = (data.setting_value as any) as ScanSettings;
        setScanPrice(settings.amount || 99);
      }
    };
    fetchScanPrice();
  }, []);

  // Fetch analysis history
  useEffect(() => {
    if (user?.id) {
      fetchAnalysisHistory();
    }
  }, [user?.id]);

  const fetchAnalysisHistory = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("resume_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnalysisHistory((data || []) as unknown as AnalysisResult[]);
    } catch (error: any) {
      console.error("Error fetching analysis history:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

      setSelectedFile(file);
      
    // Determine file type
    let fileType: 'pdf' | 'docx' | 'txt' = 'txt';
    if (file.type === "application/pdf") {
      fileType = 'pdf';
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.type.includes("msword")) {
      fileType = 'docx';
    }
    setOriginalFileType(fileType);

    // For PDF/DOCX files, upload to storage immediately
    if (fileType === 'pdf' || fileType === 'docx') {
      await handleFileUpload(file, fileType);
    } else if (file.type === "text/plain") {
      // Read text files directly
        const reader = new FileReader();
        reader.onload = (event) => {
          setResumeText(event.target?.result as string);
        };
        reader.readAsText(file);
      setOriginalFileType('txt');
    }
  };

  const handleFileUpload = async (file: File, fileType: 'pdf' | 'docx') => {
    if (!user?.id) {
      toast.error("Please log in to upload files");
      return;
    }

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop() || (fileType === 'pdf' ? 'pdf' : 'docx');
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL (or create signed URL if bucket is private)
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      setUploadedFilePath(fileName);
      setUploadedFileUrl(urlData.publicUrl);
      
      // Extract text from PDF directly in the browser using PDF.js
      if (fileType === 'pdf') {
        try {
          toast.info("Extracting text from PDF...");
          
          // Dynamic import of PDF.js for browser
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          
          // Read the file as ArrayBuffer
          const arrayBuffer = await file.arrayBuffer();
          
          // Load the PDF
          const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
          const pdf = await loadingTask.promise;
          
          // Extract text from all pages
          const textParts: string[] = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            textParts.push(pageText);
          }
          
          const extractedText = textParts.join('\n\n');
          setResumeText(extractedText);
          console.log("PDF text extracted, length:", extractedText.length);
          toast.success("File uploaded and text extracted successfully! Click 'Analyze' to proceed.");
        } catch (extractError: any) {
          console.error("PDF text extraction error:", extractError);
          toast.warning("File uploaded but text extraction failed. Analysis will use visual PDF analysis.");
          setResumeText("");
        }
      } else if (fileType === 'docx') {
        // For DOCX, just show a message - we'll handle it during analysis
        toast.success("File uploaded successfully! Click 'Analyze' to proceed.");
        setResumeText("");
      } else {
        setResumeText(""); // Clear text area for other file types
        toast.success("File uploaded successfully! Click 'Analyze' to proceed.");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file: " + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    setResumeText(pastedText);
  };

  const sanitizeText = (text: string): string => {
    if (!text) return text;
    // Remove or replace problematic Unicode escape sequences
    // Replace \u followed by digits with the actual character or remove it
    return text
      .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return '';
        }
      })
      .replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return '';
        }
      })
      // Remove other problematic escape sequences that might cause issues
      .replace(/\\(?!['"\\/bfnrt])/g, '\\\\');
  };

  const createAnalysisRecord = async (): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      // Sanitize text to avoid Unicode escape sequence issues
      // For PDF/DOCX uploads, resumeText will be empty, which is fine
      const sanitizedResumeText = resumeText ? sanitizeText(resumeText) : "";
      const sanitizedJobDescription = jobDescription ? sanitizeText(jobDescription) : null;

      // Set a default ats_score of 0 (will be updated after analysis)
      const { data, error } = await supabase
        .from("resume_analyses")
        .insert({
          user_id: user.id,
          resume_id: null, // Nullable for pasted text analysis
          resume_file_name: selectedFile?.name || "pasted_resume.txt",
          resume_content: sanitizedResumeText,
          job_description: sanitizedJobDescription,
          ats_score: 0, // Default score, will be updated after analysis
          payment_status: isProUser ? "completed" : "pending",
          amount_paid: isProUser ? 0 : scanPrice,
          original_file_path: uploadedFilePath,
          original_file_url: uploadedFileUrl,
          file_type: originalFileType,
        })
        .select()
        .single();

      if (error) {
        console.error("Database error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        throw error;
      }
      return data.id;
    } catch (error: any) {
      console.error("Error creating analysis record:", error);
      const errorMessage = error?.message || error?.details || "Unknown error";
      toast.error("Failed to create analysis record: " + errorMessage);
      return null;
    }
  };

  const handleAnalyze = async () => {
    // Check if either resume text or file is provided
    if (!resumeText.trim() && !uploadedFilePath) {
      toast.error("Please upload a resume file or paste resume text");
      return;
    }

    if (!user?.id) {
      toast.error("Please log in to continue");
      navigate("/auth");
      return;
    }

    // For FREE users, need to pay first
    if (!isProUser) {
      await handlePayAndAnalyze();
      return;
    }

    // For PRO users, analyze directly
    await runAnalysis();
  };

  const handlePayAndAnalyze = async () => {
    setProcessingPayment(true);
    try {
      // Create analysis record first
      const analysisId = await createAnalysisRecord();
      if (!analysisId) {
        setProcessingPayment(false);
        return;
      }

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-ats-scan-order",
        {
          body: {
            analysis_id: analysisId,
            amount: scanPrice,
          },
        }
      );

      if (orderError) throw orderError;
      if (!orderData?.order_id) {
        throw new Error("Failed to create payment order");
      }

      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "JobSeeker",
        description: `ATS Resume Scan - ₹${scanPrice}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke(
              "verify-ats-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );

            if (verifyError) throw verifyError;
            
            toast.success("Payment successful! Analyzing resume...");
            // Run analysis after payment
            await runAnalysis(analysisId);
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed: " + error.message);
          } finally {
            setProcessingPayment(false);
          }
        },
        prefill: {
          email: user.email || "",
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment: " + error.message);
      setProcessingPayment(false);
    }
  };

  const runAnalysis = async (analysisId?: string) => {
    setAnalyzing(true);
    try {
      // If no analysisId provided, create one
      let finalAnalysisId = analysisId;
      if (!finalAnalysisId) {
        finalAnalysisId = await createAnalysisRecord();
        if (!finalAnalysisId) {
          setAnalyzing(false);
          return;
        }
      }

      // Call analyze function - pass file_path for PDF/DOCX, resume_text for text
      const analyzeBody: any = {
          job_description: jobDescription || undefined,
          analysis_id: finalAnalysisId,
      };

      // TEMPORARY WORKAROUND: Since the deployed edge function doesn't support file_path yet,
      // we extract text from PDF and send it as resume_text
      // TODO: Once edge function is deployed with file_path support, we can use file_path directly
      if (resumeText.trim()) {
        // Use extracted text (from PDF upload or manual input)
        analyzeBody.resume_text = resumeText;
        console.log("Sending analysis request with resume_text (length):", resumeText.length);
      } else if (uploadedFilePath && originalFileType) {
        // Fallback: if no text extracted, try file_path (will work once edge function is updated)
        analyzeBody.file_path = uploadedFilePath;
        console.log("Sending analysis request with file_path:", uploadedFilePath, "file_type:", originalFileType);
      } else {
        throw new Error("No resume content provided. Please upload a file or paste text.");
      }

      console.log("Analysis request body:", {
        has_analysis_id: !!analyzeBody.analysis_id,
        has_file_path: !!analyzeBody.file_path,
        has_resume_text: !!analyzeBody.resume_text,
        has_job_description: !!analyzeBody.job_description,
        analysis_id: analyzeBody.analysis_id,
        file_path: analyzeBody.file_path,
      });

      console.log("Calling analyze-resume-ats with body:", {
        analysis_id: analyzeBody.analysis_id,
        has_file_path: !!analyzeBody.file_path,
        has_resume_text: !!analyzeBody.resume_text,
        file_path: analyzeBody.file_path,
        resume_text_length: analyzeBody.resume_text?.length || 0,
      });

      const { data, error } = await supabase.functions.invoke("analyze-resume-ats", {
        body: analyzeBody,
      });

      if (error) {
        console.error("Analysis error:", error);
        console.error("Error details:", {
          message: error.message,
          status: (error as any).status,
          context: (error as any).context,
        });
        throw error;
      }

      // Fetch updated analysis
      const { data: updatedAnalysis, error: fetchError } = await supabase
        .from("resume_analyses")
        .select("*")
        .eq("id", finalAnalysisId)
        .single();

      if (fetchError) throw fetchError;

      setCurrentAnalysis(updatedAnalysis as unknown as AnalysisResult);
      setSelectedSuggestions(new Set()); // Reset selections
      setOptimizedResume(null); // Reset optimized resume
      setShowOptimized(false);
      toast.success("Analysis completed!");
      fetchAnalysisHistory();
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze resume: " + (error.message || "Unknown error"));
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleOptimizeResume = async () => {
    if (!currentAnalysis || selectedSuggestions.size === 0) {
      toast.error("Please select at least one suggestion to apply");
      return;
    }

    if (!resumeText.trim()) {
      toast.error("Original resume text is required");
      return;
    }

    setOptimizing(true);
    try {
      // Collect selected suggestions
      const analysisResult = currentAnalysis.analysis_result || {};
      const allSuggestions: any[] = [];
      
      // Get action items
      const actionItems = analysisResult.action_items || [];
      actionItems.forEach((item: any, idx: number) => {
        if (selectedSuggestions.has(idx)) {
          allSuggestions.push({
            category: item.category || "general",
            priority: item.priority === 1 ? "high" : item.priority === 2 ? "medium" : "low",
            suggestion: item.action,
            action: item.action,
            keyword: item.keyword,
            where_to_add: item.where_to_add,
          });
        }
      });

      // Get formatting issues
      const formattingIssues = analysisResult.formatting_issues || [];
      formattingIssues.forEach((issue: any, idx: number) => {
        const actionIdx = actionItems.length + idx;
        if (selectedSuggestions.has(actionIdx)) {
          allSuggestions.push({
            category: "formatting",
            priority: issue.severity || "medium",
            suggestion: issue.recommendation,
            action: `Fix: ${issue.issue}`,
          });
        }
      });

      // Get content improvements
      const contentImprovements = analysisResult.content_improvements || [];
      contentImprovements.forEach((improvement: any, idx: number) => {
        const actionIdx = actionItems.length + formattingIssues.length + idx;
        if (selectedSuggestions.has(actionIdx)) {
          allSuggestions.push({
            category: "content",
            priority: improvement.priority || "medium",
            suggestion: improvement.suggestion,
            action: `Improve: ${improvement.area}`,
          });
        }
      });

      // Get job-specific suggestions
      const jobSuggestions = analysisResult.job_specific_suggestions || [];
      jobSuggestions.forEach((suggestion: any, idx: number) => {
        const actionIdx = actionItems.length + formattingIssues.length + contentImprovements.length + idx;
        if (selectedSuggestions.has(actionIdx)) {
          allSuggestions.push({
            category: "keywords",
            priority: "high",
            suggestion: suggestion.reason,
            action: `Add keyword: ${suggestion.keyword}`,
            keyword: suggestion.keyword,
            where_to_add: suggestion.where_to_add,
          });
        }
      });

      // Call optimize function
      const { data, error } = await supabase.functions.invoke("optimize-resume", {
        body: {
          original_resume_text: resumeText,
          suggestions: allSuggestions,
          job_description: jobDescription || undefined,
          analysis_id: currentAnalysis.id,
        },
      });

      if (error) throw error;

      if (data?.optimized_resume_text) {
        setOptimizedResume(data.optimized_resume_text);
        setShowOptimized(true);
        toast.success(`Applied ${data.applied_suggestions_count} suggestions successfully!`);
        
        // Update current analysis to include optimized text
        setCurrentAnalysis({
          ...currentAnalysis,
          analysis_result: {
            ...analysisResult,
            optimized_resume_text: data.optimized_resume_text,
            applied_suggestions: allSuggestions,
          },
        });
      }
    } catch (error: any) {
      console.error("Optimization error:", error);
      toast.error("Failed to optimize resume: " + (error.message || "Unknown error"));
    } finally {
      setOptimizing(false);
    }
  };

  const handleDownloadOptimized = () => {
    if (!optimizedResume) return;
    
    const blob = new Blob([optimizedResume], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optimized_resume_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Resume downloaded!");
  };

  const handleDownloadOriginal = async () => {
    if (!uploadedFilePath && !uploadedFileUrl) {
      toast.error("No original file available");
      return;
    }

    try {
      let fileBlob: Blob;
      
      if (uploadedFilePath) {
        // Download from storage
        const { data, error } = await supabase.storage
          .from("resumes")
          .download(uploadedFilePath);
        
        if (error) throw error;
        fileBlob = data;
      } else if (uploadedFileUrl) {
        // Download from URL
        const response = await fetch(uploadedFileUrl);
        if (!response.ok) throw new Error("Failed to fetch file");
        fileBlob = await response.blob();
      } else {
        throw new Error("No file available");
      }

      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFile?.name || `resume_${new Date().toISOString().split("T")[0]}.${originalFileType || 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Original file downloaded!");
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error("Failed to download file: " + error.message);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const analysisResult = currentAnalysis?.analysis_result || {};
  const keywordAnalysis = analysisResult.keyword_analysis || {};
  const formattingIssues = analysisResult.formatting_issues || [];
  const contentImprovements = analysisResult.content_improvements || [];
  const actionItems = analysisResult.action_items || [];

  return (
    <>
      <SEOHead
        title="Resume Optimizer | JobSeeker - AI-Powered ATS Score Checker"
        description="Optimize your resume with AI-powered ATS compatibility scoring. Get instant feedback, keyword matching, and actionable suggestions to improve your resume."
        keywords="resume optimizer, ATS score checker, resume analysis, job search tool, ATS compatibility"
        canonicalUrl="/resume-optimizer"
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileSearch className="w-5 h-5 text-accent" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Resume Optimizer</h1>
            </div>
            <p className="text-muted-foreground">
              Get AI-powered ATS compatibility scores and optimization suggestions for your resume
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Section - Resume Input */}
            <div className="lg:col-span-2 space-y-6">
              {/* Resume Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>Resume</CardTitle>
                  <CardDescription>Upload a file or paste your resume text</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload File
                        </>
                      )}
                    </Button>
                    {selectedFile && (
                      <Badge variant="secondary" className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        {selectedFile.name}
                        {uploadedFilePath && (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        )}
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    placeholder="Or paste your resume text here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    onPaste={handlePaste}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>

              {/* Job Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Description (Optional)</CardTitle>
                  <CardDescription>Paste the job description for keyword matching</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste the job description here for targeted keyword analysis..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={8}
                  />
                </CardContent>
              </Card>

              {/* Action Card */}
              <Card className={`border-2 ${isProUser ? 'border-accent/50 bg-accent/5' : 'border-primary/50 bg-primary/5'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        {isProUser ? "Unlimited Free Scans" : `Pay ₹${scanPrice} per Scan`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isProUser 
                          ? "As a PRO user, you get unlimited ATS resume scans"
                          : "FREE users pay per scan. Upgrade to PRO for unlimited scans"
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {resumeText.trim() && (
                        <Button
                          onClick={() => setShowTemplates(true)}
                          variant="outline"
                          size="lg"
                        >
                          <Palette className="mr-2 h-4 w-4" />
                          Templates
                        </Button>
                      )}
                    <Button
                      onClick={handleAnalyze}
                        disabled={loading || analyzing || processingPayment || (!resumeText.trim() && !uploadedFilePath)}
                      size="lg"
                      className={isProUser ? "bg-accent hover:bg-accent/90" : ""}
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Payment...
                        </>
                      ) : analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : isProUser ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analyze (Unlimited)
                        </>
                      ) : (
                        <>
                          <IndianRupee className="mr-2 h-4 w-4" />
                          Pay & Analyze
                        </>
                      )}
                    </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Optimized Resume Display */}
              {showOptimized && optimizedResume && (
                <Card className="border-green-500/50 bg-green-500/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-green-500" />
                        Optimized Resume
                      </CardTitle>
                      <Button
                        onClick={handleDownloadOptimized}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                    <CardDescription>
                      Your resume has been optimized with {selectedSuggestions.size} applied suggestions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Textarea
                        value={optimizedResume}
                        onChange={(e) => setOptimizedResume(e.target.value)}
                        rows={15}
                        className="font-mono text-sm"
                      />
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <Button
                          onClick={() => setShowTemplates(true)}
                          className="bg-accent hover:bg-accent/90"
                          size="sm"
                        >
                          <Palette className="mr-2 h-4 w-4" />
                          Choose Template
                        </Button>
                        <Button
                          onClick={() => {
                            setResumeText(optimizedResume);
                            setShowOptimized(false);
                            toast.success("Optimized resume loaded for further editing");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          Use as New Resume
                        </Button>
                        <Button
                          onClick={() => setShowOptimized(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Analysis Results */}
              {currentAnalysis && !showOptimized && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="keywords" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="keywords">Keywords</TabsTrigger>
                        <TabsTrigger value="formatting">Formatting</TabsTrigger>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="actions">Action Items</TabsTrigger>
                      </TabsList>

                      <TabsContent value="keywords" className="space-y-4 mt-4">
                        <div>
                          <h4 className="font-semibold mb-2">Found Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {(keywordAnalysis.found_keywords || currentAnalysis.matched_keywords || []).map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="default" className="bg-green-500">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Missing Keywords</h4>
                          <div className="flex flex-wrap gap-2">
                            {(keywordAnalysis.missing_keywords || currentAnalysis.missing_keywords || []).map((keyword: string, idx: number) => (
                              <Badge key={idx} variant="destructive">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="formatting" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            Select formatting fixes to apply
                          </p>
                          {selectedSuggestions.size > 0 && (
                            <Button
                              onClick={handleOptimizeResume}
                              disabled={optimizing}
                              size="sm"
                              className="bg-accent hover:bg-accent/90"
                            >
                              {optimizing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Optimizing...
                                </>
                              ) : (
                                <>
                                  <Wand2 className="mr-2 h-4 w-4" />
                                  Apply Selected
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        {formattingIssues.map((issue: any, idx: number) => {
                          const actionItemsCount = (analysisResult.action_items || []).length;
                          const suggestionIdx = actionItemsCount + idx;
                          const isSelected = selectedSuggestions.has(suggestionIdx);
                          return (
                            <div key={idx} className={`p-4 border rounded-lg transition-colors ${isSelected ? 'border-accent bg-accent/5' : ''}`}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{issue.issue}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{issue.recommendation}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Badge variant={issue.severity === "high" ? "destructive" : "secondary"}>
                                    {issue.severity}
                                  </Badge>
                                  <Button
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleSuggestion(suggestionIdx)}
                                  >
                                    {isSelected ? (
                                      <>
                                        <Check className="mr-1 h-3 w-3" />
                                        Applied
                                      </>
                                    ) : (
                                      <>
                                        <Wand2 className="mr-1 h-3 w-3" />
                                        Apply
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </TabsContent>

                      <TabsContent value="content" className="space-y-4 mt-4">
                        <div>
                          <h4 className="font-semibold mb-2">Strengths</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {(analysisResult.content_strengths || []).map((strength: string, idx: number) => (
                              <li key={idx} className="text-sm">{strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Improvements</h4>
                            {selectedSuggestions.size > 0 && (
                              <Button
                                onClick={handleOptimizeResume}
                                disabled={optimizing}
                                size="sm"
                                className="bg-accent hover:bg-accent/90"
                              >
                                {optimizing ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Optimizing...
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Apply Selected
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          {contentImprovements.map((improvement: any, idx: number) => {
                            const actionItemsCount = (analysisResult.action_items || []).length;
                            const formattingCount = (analysisResult.formatting_issues || []).length;
                            const suggestionIdx = actionItemsCount + formattingCount + idx;
                            const isSelected = selectedSuggestions.has(suggestionIdx);
                            return (
                              <div key={idx} className={`p-4 border rounded-lg mb-2 transition-colors ${isSelected ? 'border-accent bg-accent/5' : ''}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h5 className="font-medium">{improvement.area}</h5>
                                    <p className="text-sm text-muted-foreground mt-1 mb-1">
                                      <strong>Current:</strong> {improvement.current_state}
                                    </p>
                                    <p className="text-sm">{improvement.suggestion}</p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <Badge variant={improvement.priority === "high" ? "destructive" : "secondary"}>
                                      {improvement.priority}
                                    </Badge>
                                    <Button
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleSuggestion(suggestionIdx)}
                                    >
                                      {isSelected ? (
                                        <>
                                          <Check className="mr-1 h-3 w-3" />
                                          Applied
                                        </>
                                      ) : (
                                        <>
                                          <Wand2 className="mr-1 h-3 w-3" />
                                          Apply
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TabsContent>

                      <TabsContent value="actions" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            Select suggestions to apply ({selectedSuggestions.size} selected)
                          </p>
                          {selectedSuggestions.size > 0 && (
                            <Button
                              onClick={handleOptimizeResume}
                              disabled={optimizing}
                              size="sm"
                              className="bg-accent hover:bg-accent/90"
                            >
                              {optimizing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Optimizing...
                                </>
                              ) : (
                                <>
                                  <Wand2 className="mr-2 h-4 w-4" />
                                  Apply Selected ({selectedSuggestions.size})
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        <ol className="list-decimal list-inside space-y-3">
                          {actionItems
                            .sort((a: any, b: any) => a.priority - b.priority)
                            .map((item: any, idx: number) => {
                              const isSelected = selectedSuggestions.has(idx);
                              return (
                                <li key={idx} className={`p-4 border rounded-lg transition-colors ${isSelected ? 'border-accent bg-accent/5' : ''}`}>
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold">{item.action}</h4>
                                        <Badge variant="outline">{item.category}</Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{item.impact}</p>
                                    </div>
                                    <Button
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleSuggestion(idx)}
                                      className="ml-4"
                                    >
                                      {isSelected ? (
                                        <>
                                          <Check className="mr-1 h-3 w-3" />
                                          Applied
                                        </>
                                      ) : (
                                        <>
                                          <Wand2 className="mr-1 h-3 w-3" />
                                          Apply
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </li>
                              );
                            })}
                        </ol>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* ATS Score Display */}
              {currentAnalysis && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                    <CardTitle>ATS Score</CardTitle>
                      {uploadedFilePath && originalFileType && (
                        <Button
                          onClick={handleDownloadOriginal}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Original {originalFileType.toUpperCase()}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${getScoreColor(currentAnalysis.ats_score)}`}>
                        {currentAnalysis.ats_score}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">out of 100</div>
                    </div>
                    <Progress value={currentAnalysis.ats_score} className="h-3" />
                    
                    <div className="space-y-3 pt-4 border-t">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Keywords</span>
                          <span>{currentAnalysis.keyword_match_score || 0}%</span>
                        </div>
                        <Progress value={currentAnalysis.keyword_match_score || 0} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Formatting</span>
                          <span>{analysisResult.analysis_data?.formatting_score || 0}%</span>
                        </div>
                        <Progress value={analysisResult.analysis_data?.formatting_score || 0} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Content</span>
                          <span>{analysisResult.analysis_data?.content_score || 0}%</span>
                        </div>
                        <Progress value={analysisResult.analysis_data?.content_score || 0} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Analysis History */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Analyses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No analyses yet
                      </p>
                    ) : (
                      analysisHistory.map((analysis) => (
                        <div
                          key={analysis.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-accent/5 transition-colors"
                          onClick={() => setCurrentAnalysis(analysis)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={`text-2xl font-bold ${getScoreColor(analysis.ats_score)}`}>
                              {analysis.ats_score}
                            </div>
                            {analysis.payment_status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(analysis.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Templates Dialog */}
      <ResumeTemplates
        originalResume={resumeText}
        optimizedResume={optimizedResume}
        open={showTemplates}
        onOpenChange={setShowTemplates}
        profilePhotoUrl={profile?.profile_photo_url}
        userName={profile?.name}
        userEmail={profile?.email}
        userPhone={profile?.phone}
        userLocation={profile?.location}
        userLinkedIn={profile?.linkedin_url}
        professionalTitle={profile?.professional_title}
        formattingData={currentAnalysis?.formatting_analysis || currentAnalysis?.formatting_preservation || null}
      />
    </>
  );
};

export default ResumeOptimizer;

