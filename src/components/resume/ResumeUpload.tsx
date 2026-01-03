import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResumeUploadProps {
  onUploadSuccess: (resume: any) => void;
  setAsActive?: boolean;
  disabled?: boolean;
}

const ResumeUpload = ({ onUploadSuccess, setAsActive = false, disabled = false }: ResumeUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [resumeName, setResumeName] = useState("");
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      if (!resumeName) {
        setResumeName(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [resumeName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    disabled: disabled,
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", resumeName || file.name);
      formData.append("setAsActive", setAsActive.toString());

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

      // Supabase client automatically adds Authorization header when user is authenticated
      // But we'll also pass it explicitly to ensure it's included
      const response = await supabase.functions.invoke("upload-resume", {
        body: formData,
      });

      const { data, error } = response;

      if (error) {
        // Try to extract error message from error object
        let errorMessage = "Failed to upload resume";
        
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
        
        console.error("Upload function error:", { error, data, response });
        throw new Error(errorMessage);
      }

      if (data?.error) {
        throw new Error(data.error || data.details || "Upload failed");
      }

      if (!data || !data.resume) {
        throw new Error("Invalid response from server: No resume data returned");
      }

      toast.success("Resume uploaded successfully!");
      onUploadSuccess(data.resume);
      setFile(null);
      setResumeName("");
      
      // Trigger a page refresh or state update to ensure resume persists
      // The parent component should handle refreshing the list
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResumeName("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Resume</CardTitle>
        <CardDescription>
          Upload your resume in PDF, DOCX, or TXT format (max 5MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              {isDragActive ? "Drop the file here" : "Drag & drop your resume here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOCX, TXT (max 5MB)
            </p>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-accent" />
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {file && (
          <>
            <div className="space-y-2">
              <Label htmlFor="resume-name">Resume Name</Label>
              <Input
                id="resume-name"
                value={resumeName}
                onChange={(e) => setResumeName(e.target.value)}
                placeholder="Enter a name for this resume"
                disabled={uploading}
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading || !resumeName.trim()}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resume
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ResumeUpload;

