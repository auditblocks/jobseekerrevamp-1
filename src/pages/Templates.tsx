import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Plus,
  FileText,
  Star,
  Copy,
  Pencil,
  Trash2,
  ChevronDown,
  Filter,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const mockTemplates = [
  {
    id: 1,
    name: "Software Engineer Outreach",
    subject: "Experienced Software Engineer - Open to Opportunities",
    body: "Dear {{recruiterName}},\n\nI hope this email finds you well. My name is {{userName}}, and I am a software engineer with expertise in...",
    category: "Technology",
    industry: "Software",
    rating: 4.8,
    usageCount: 156,
    isGlobal: true
  },
  {
    id: 2,
    name: "Data Science Position",
    subject: "Data Scientist with ML Expertise",
    body: "Hi {{recruiterName}},\n\nI'm reaching out regarding potential data science opportunities at {{companyName}}...",
    category: "Technology",
    industry: "Data Science",
    rating: 4.5,
    usageCount: 89,
    isGlobal: true
  },
  {
    id: 3,
    name: "Finance Industry Application",
    subject: "Experienced Finance Professional",
    body: "Dear {{recruiterName}},\n\nWith over 5 years of experience in financial analysis and risk management...",
    category: "Finance",
    industry: "Banking",
    rating: 4.2,
    usageCount: 67,
    isGlobal: true
  },
  {
    id: 4,
    name: "Follow-Up Template",
    subject: "Following Up - {{jobTitle}} Position",
    body: "Hi {{recruiterName}},\n\nI wanted to follow up on my previous email regarding the {{jobTitle}} position...",
    category: "General",
    industry: "All",
    rating: 4.6,
    usageCount: 234,
    isGlobal: true
  },
  {
    id: 5,
    name: "My Custom Template",
    subject: "Custom Introduction",
    body: "Hello,\n\nThis is my personalized template...",
    category: "General",
    industry: "All",
    rating: 0,
    usageCount: 5,
    isGlobal: false
  },
];

const categories = ["All", "Technology", "Finance", "Healthcare", "Marketing", "General"];

const Templates = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showGlobalOnly, setShowGlobalOnly] = useState(false);

  const filteredTemplates = mockTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || template.category === selectedCategory;
    const matchesGlobal = !showGlobalOnly || template.isGlobal;
    return matchesSearch && matchesCategory && matchesGlobal;
  });

  const handleUseTemplate = (template: typeof mockTemplates[0]) => {
    toast.success(`Template "${template.name}" selected!`);
    navigate("/compose");
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
              <Button variant="hero" onClick={() => toast.info("Create template modal coming soon!")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-border/50 bg-card/50 hover:border-accent/50 transition-all h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <FileText className="h-4 w-4 text-accent" />
                        </div>
                        {template.isGlobal && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Global
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="text-sm font-medium">{template.rating || "—"}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {template.subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                      {template.body}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Used {template.usageCount} times
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUseTemplate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!template.isGlobal && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
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
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default Templates;
