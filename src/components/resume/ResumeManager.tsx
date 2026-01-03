import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Trash2, Play, Star, StarOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Resume {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ResumeManagerProps {
  onAnalyze: (resumeId: string) => void;
  onResumeSelect?: (resume: Resume) => void;
}

const ResumeManager = ({ onAnalyze, onResumeSelect }: ResumeManagerProps) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);

  const fetchResumes = async () => {
    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (error: any) {
      console.error("Error fetching resumes:", error);
      toast.error("Failed to load resumes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleSetActive = async (resumeId: string) => {
    try {
      // Set all resumes as inactive first
      await supabase
        .from("resumes")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Set selected resume as active
      const { error } = await supabase
        .from("resumes")
        .update({ is_active: true })
        .eq("id", resumeId);

      if (error) throw error;

      toast.success("Active resume updated");
      fetchResumes();
    } catch (error: any) {
      console.error("Error setting active resume:", error);
      toast.error("Failed to update active resume");
    }
  };

  const handleDelete = async () => {
    if (!resumeToDelete) return;

    setDeletingId(resumeToDelete);
    try {
      // Get file URL to delete from storage
      const resume = resumes.find((r) => r.id === resumeToDelete);
      if (resume?.file_url) {
        const fileName = resume.file_url.split("/").pop();
        if (fileName) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.storage
              .from("resumes")
              .remove([`${user.id}/${fileName}`]);
          }
        }
      }

      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeToDelete);

      if (error) throw error;

      toast.success("Resume deleted successfully");
      fetchResumes();
      setDeleteDialogOpen(false);
      setResumeToDelete(null);
    } catch (error: any) {
      console.error("Error deleting resume:", error);
      toast.error("Failed to delete resume");
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (resumes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Resumes</CardTitle>
          <CardDescription>You haven't uploaded any resumes yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Resumes</CardTitle>
          <CardDescription>Manage your uploaded resumes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumes.map((resume) => (
                  <TableRow key={resume.id}>
                    <TableCell className="font-medium">{resume.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{resume.file_type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(resume.file_size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(resume.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {resume.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <Star className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!resume.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetActive(resume.id)}
                            title="Set as active"
                          >
                            <StarOff className="w-4 h-4 mr-1" />
                            Set Active
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            onAnalyze(resume.id);
                            if (onResumeSelect) onResumeSelect(resume);
                          }}
                          title="Analyze resume"
                          className="bg-accent hover:bg-accent/90"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Analyze
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setResumeToDelete(resume.id);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete resume"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resume? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ResumeManager;

