import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ArrowLeft,
  Search,
  Plus,
  FileText,
  Star,
  Copy,
  Pencil,
  Trash2,
  Sparkles,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Database interface
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  industry: string | null;
  rating: number | null;
  usage_count: number | null;
  is_global: boolean | null;
  user_id: string | null;
  created_at: string;
}

const categories = ["All", "Technology", "Finance", "Healthcare", "Marketing", "General"];

const Templates = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showGlobalOnly, setShowGlobalOnly] = useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    category: "General",
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load templates");
        throw error;
      }
      return data as EmailTemplate[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newTemplate: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("email_templates")
        .insert([{
          ...newTemplate,
          user_id: user.id,
          is_global: false,
          rating: 0,
          usage_count: 0
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setIsCreateOpen(false);
      setFormData({ name: "", subject: "", body: "", category: "General" });
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error(`Error creating template: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          name: formData.name,
          subject: formData.subject,
          body: formData.body,
          category: formData.category,
        })
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setIsEditOpen(false);
      setSelectedTemplate(null);
      toast.success("Template updated successfully");
    },
    onError: (error) => {
      toast.error(`Error updating template: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      setIsDeleteOpen(false);
      setSelectedTemplate(null);
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error(`Error deleting template: ${error.message}`);
    },
  });

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || template.category === selectedCategory;

    const isGlobal = template.is_global;

    // If showing global only, filter out non-global
    if (showGlobalOnly && !isGlobal) return false;

    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template: EmailTemplate) => {
    // Navigate to compose with template data
    navigate("/compose", { state: { template } });
    toast.success(`Template "${template.name}" selected!`);
  };

  const openEditModal = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category || "General",
    });
    setIsEditOpen(true);
  };

  const openDeleteModal = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Email Templates | JobSeeker</title>
        <meta name="description" content="Browse and use professional email templates" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">Email Templates</h1>
                  <p className="text-sm text-muted-foreground">Professional templates for outreach</p>
                </div>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" onClick={() => setFormData({ name: "", subject: "", body: "", category: "General" })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Template</DialogTitle>
                    <DialogDescription>
                      Add a new email template to your collection.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Software Engineer Outreach"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c !== "All").map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="subject">Subject Line</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="e.g., Application for {{jobTitle}}"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="body">Email Body</Label>
                      <Textarea
                        id="body"
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        placeholder="Hi {{recruiterName}}, ..."
                        className="h-[200px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Supported variables: {"{{recruiterName}}"}, {"{{companyName}}"}, {"{{jobTitle}}"}, {"{{userName}}"}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/50"
              />
            </div>
            <Button
              variant={showGlobalOnly ? "accent" : "outline"}
              onClick={() => setShowGlobalOnly(!showGlobalOnly)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Global Templates
            </Button>
          </motion.div>

          {/* Category Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "accent" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </motion.div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence>
                {filteredTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="border-border/50 bg-card/50 hover:border-accent/50 transition-all h-full flex flex-col group">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-accent/10">
                              <FileText className="h-4 w-4 text-accent" />
                            </div>
                            {template.is_global && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Global
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {template.rating && template.rating > 0 && (
                              <>
                                <Star className="h-4 w-4 fill-warning text-warning" />
                                <span className="text-sm font-medium">{template.rating}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                        <CardDescription className="line-clamp-1">
                          {template.subject}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-4">
                          {template.body}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {template.category || "Uncategorized"}
                            </Badge>
                            {template.usage_count !== null && (
                              <span className="text-xs text-muted-foreground">
                                Used {template.usage_count} times
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleUseTemplate(template)}
                              title="Use Template"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!template.is_global && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditModal(template)}
                                  title="Edit Template"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => openDeleteModal(template)}
                                  title="Delete Template"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[525px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Template</DialogTitle>
                <DialogDescription>
                  Make changes to your template here.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Template Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c !== "All").map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-subject">Subject Line</Label>
                  <Input
                    id="edit-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-body">Email Body</Label>
                  <Textarea
                    id="edit-body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="h-[200px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedTemplate && updateMutation.mutate(selectedTemplate)}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Alert Dialog */}
          <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the template
                  "{selectedTemplate?.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </>
  );
};

export default Templates;
