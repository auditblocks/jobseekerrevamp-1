import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, X, Eye, FileDown, FileText } from "lucide-react";
import { toast } from "sonner";
import { StructuredResumeData } from "@/types/resume";
import { ResumeTemplates } from "./ResumeTemplates";

interface ResumeTemplateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: StructuredResumeData | null;
  profilePhotoUrl?: string | null;
}

export const ResumeTemplateBuilder = ({
  open,
  onOpenChange,
  initialData,
  profilePhotoUrl,
}: ResumeTemplateBuilderProps) => {
  const [resumeData, setResumeData] = useState<StructuredResumeData>({
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
    },
    professionalTitle: "",
    summary: "",
    workExperience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
  });

  const [showTemplates, setShowTemplates] = useState(false);
  const [currentSkill, setCurrentSkill] = useState("");

  // Initialize with provided data
  useEffect(() => {
    if (initialData) {
      setResumeData(initialData);
    }
  }, [initialData]);

  const updatePersonalInfo = (field: keyof StructuredResumeData["personalInfo"], value: string) => {
    setResumeData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }));
  };

  const addWorkExperience = () => {
    setResumeData((prev) => ({
      ...prev,
      workExperience: [
        ...prev.workExperience,
        {
          jobTitle: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          description: [""],
        },
      ],
    }));
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    setResumeData((prev) => {
      const updated = [...prev.workExperience];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, workExperience: updated };
    });
  };

  const addWorkDescription = (index: number) => {
    setResumeData((prev) => {
      const updated = [...prev.workExperience];
      updated[index].description = [...updated[index].description, ""];
      return { ...prev, workExperience: updated };
    });
  };

  const updateWorkDescription = (expIndex: number, descIndex: number, value: string) => {
    setResumeData((prev) => {
      const updated = [...prev.workExperience];
      updated[expIndex].description[descIndex] = value;
      return { ...prev, workExperience: updated };
    });
  };

  const removeWorkDescription = (expIndex: number, descIndex: number) => {
    setResumeData((prev) => {
      const updated = [...prev.workExperience];
      updated[expIndex].description = updated[expIndex].description.filter((_, i) => i !== descIndex);
      return { ...prev, workExperience: updated };
    });
  };

  const removeWorkExperience = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.filter((_, i) => i !== index),
    }));
  };

  const addEducation = () => {
    setResumeData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          degree: "",
          institution: "",
          location: "",
          graduationDate: "",
          gpa: "",
        },
      ],
    }));
  };

  const updateEducation = (index: number, field: string, value: string) => {
    setResumeData((prev) => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  const removeEducation = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const addSkill = () => {
    if (currentSkill.trim()) {
      setResumeData((prev) => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()],
      }));
      setCurrentSkill("");
    }
  };

  const removeSkill = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const addProject = () => {
    setResumeData((prev) => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        {
          name: "",
          description: "",
          technologies: [],
          duration: "",
        },
      ],
    }));
  };

  const updateProject = (index: number, field: string, value: any) => {
    setResumeData((prev) => {
      const projects = prev.projects || [];
      const updated = [...projects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const removeProject = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      projects: (prev.projects || []).filter((_, i) => i !== index),
    }));
  };

  const addCertification = () => {
    setResumeData((prev) => ({
      ...prev,
      certifications: [...(prev.certifications || []), ""],
    }));
  };

  const updateCertification = (index: number, value: string) => {
    setResumeData((prev) => {
      const certs = prev.certifications || [];
      const updated = [...certs];
      updated[index] = value;
      return { ...prev, certifications: updated };
    });
  };

  const removeCertification = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      certifications: (prev.certifications || []).filter((_, i) => i !== index),
    }));
  };

  const addLanguage = () => {
    setResumeData((prev) => ({
      ...prev,
      languages: [...(prev.languages || []), ""],
    }));
  };

  const updateLanguage = (index: number, value: string) => {
    setResumeData((prev) => {
      const langs = prev.languages || [];
      const updated = [...langs];
      updated[index] = value;
      return { ...prev, languages: updated };
    });
  };

  const removeLanguage = (index: number) => {
    setResumeData((prev) => ({
      ...prev,
      languages: (prev.languages || []).filter((_, i) => i !== index),
    }));
  };

  const validateData = (): boolean => {
    if (!resumeData.personalInfo.name.trim()) {
      toast.error("Please enter your name");
      return false;
    }
    if (!resumeData.personalInfo.email.trim()) {
      toast.error("Please enter your email");
      return false;
    }
    if (resumeData.workExperience.length === 0) {
      toast.error("Please add at least one work experience");
      return false;
    }
    if (resumeData.education.length === 0) {
      toast.error("Please add at least one education entry");
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateData()) return;
    setShowTemplates(true);
  };

  // Convert structured data to resume text format for template rendering
  const convertToResumeText = (): string => {
    let text = `${resumeData.personalInfo.name}\n`;
    if (resumeData.professionalTitle) {
      text += `${resumeData.professionalTitle}\n`;
    }
    text += `${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone} | ${resumeData.personalInfo.location}\n`;
    if (resumeData.personalInfo.linkedin) {
      text += `${resumeData.personalInfo.linkedin}\n`;
    }
    text += `\nPROFILE SUMMARY\n${resumeData.summary}\n\n`;
    
    if (resumeData.workExperience.length > 0) {
      text += `WORK EXPERIENCE\n`;
      resumeData.workExperience.forEach((exp) => {
        text += `\n${exp.jobTitle}\n${exp.company}\n${exp.startDate} - ${exp.current ? "Present" : exp.endDate}\n`;
        exp.description.forEach((desc) => {
          text += `• ${desc}\n`;
        });
      });
      text += `\n`;
    }

    if (resumeData.education.length > 0) {
      text += `EDUCATION\n`;
      resumeData.education.forEach((edu) => {
        text += `${edu.degree}\n${edu.institution}\n${edu.graduationDate}\n\n`;
      });
    }

    if (resumeData.skills.length > 0) {
      text += `SKILLS\n${resumeData.skills.join(", ")}\n\n`;
    }

    if (resumeData.projects && resumeData.projects.length > 0) {
      text += `PROJECTS\n`;
      resumeData.projects.forEach((proj) => {
        text += `${proj.name}\n${proj.description}\n\n`;
      });
    }

    if (resumeData.certifications && resumeData.certifications.length > 0) {
      text += `CERTIFICATIONS\n${resumeData.certifications.join("\n")}\n\n`;
    }

    if (resumeData.languages && resumeData.languages.length > 0) {
      text += `LANGUAGES\n${resumeData.languages.join(", ")}\n`;
    }

    return text;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resume Template Builder</DialogTitle>
            <DialogDescription>
              Edit your resume information and choose a template to download
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={resumeData.personalInfo.name}
                        onChange={(e) => updatePersonalInfo("name", e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Professional Title</Label>
                      <Input
                        value={resumeData.professionalTitle || ""}
                        onChange={(e) => setResumeData((prev) => ({ ...prev, professionalTitle: e.target.value }))}
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={resumeData.personalInfo.email}
                        onChange={(e) => updatePersonalInfo("email", e.target.value)}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input
                        value={resumeData.personalInfo.phone}
                        onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location *</Label>
                      <Input
                        value={resumeData.personalInfo.location}
                        onChange={(e) => updatePersonalInfo("location", e.target.value)}
                        placeholder="City, State, Country"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn</Label>
                      <Input
                        value={resumeData.personalInfo.linkedin || ""}
                        onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
                        placeholder="linkedin.com/in/username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input
                        value={resumeData.personalInfo.website || ""}
                        onChange={(e) => updatePersonalInfo("website", e.target.value)}
                        placeholder="www.example.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Summary</CardTitle>
                  <CardDescription>Write a compelling summary of your professional background</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={resumeData.summary}
                    onChange={(e) => setResumeData((prev) => ({ ...prev, summary: e.target.value }))}
                    placeholder="Experienced professional with expertise in..."
                    className="min-h-[200px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="experience" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Work Experience</CardTitle>
                    <Button onClick={addWorkExperience} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Experience
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {resumeData.workExperience.map((exp, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Experience {index + 1}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWorkExperience(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Job Title *</Label>
                            <Input
                              value={exp.jobTitle}
                              onChange={(e) => updateWorkExperience(index, "jobTitle", e.target.value)}
                              placeholder="Software Engineer"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Company *</Label>
                            <Input
                              value={exp.company}
                              onChange={(e) => updateWorkExperience(index, "company", e.target.value)}
                              placeholder="Company Name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                              value={exp.location || ""}
                              onChange={(e) => updateWorkExperience(index, "location", e.target.value)}
                              placeholder="City, State"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Start Date *</Label>
                            <Input
                              value={exp.startDate}
                              onChange={(e) => updateWorkExperience(index, "startDate", e.target.value)}
                              placeholder="MM/YYYY"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                              value={exp.endDate}
                              onChange={(e) => updateWorkExperience(index, "endDate", e.target.value)}
                              placeholder="MM/YYYY or Present"
                              disabled={exp.current}
                            />
                          </div>
                          <div className="space-y-2 flex items-end">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={exp.current}
                                onChange={(e) => updateWorkExperience(index, "current", e.target.checked)}
                                className="rounded"
                              />
                              <Label>Current Position</Label>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Responsibilities & Achievements</Label>
                          {exp.description.map((desc, descIndex) => (
                            <div key={descIndex} className="flex gap-2">
                              <Textarea
                                value={desc}
                                onChange={(e) => updateWorkDescription(index, descIndex, e.target.value)}
                                placeholder="Describe your responsibilities and achievements..."
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWorkDescription(index, descIndex)}
                                disabled={exp.description.length === 1}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addWorkDescription(index)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Bullet Point
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {resumeData.workExperience.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No work experience added yet. Click "Add Experience" to get started.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="education" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Education</CardTitle>
                    <Button onClick={addEducation} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Education
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resumeData.education.map((edu, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Education {index + 1}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEducation(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Degree *</Label>
                            <Input
                              value={edu.degree}
                              onChange={(e) => updateEducation(index, "degree", e.target.value)}
                              placeholder="Bachelor of Science in Computer Science"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Institution *</Label>
                            <Input
                              value={edu.institution}
                              onChange={(e) => updateEducation(index, "institution", e.target.value)}
                              placeholder="University Name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                              value={edu.location || ""}
                              onChange={(e) => updateEducation(index, "location", e.target.value)}
                              placeholder="City, State"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Graduation Date *</Label>
                            <Input
                              value={edu.graduationDate}
                              onChange={(e) => updateEducation(index, "graduationDate", e.target.value)}
                              placeholder="MM/YYYY"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>GPA (Optional)</Label>
                            <Input
                              value={edu.gpa || ""}
                              onChange={(e) => updateEducation(index, "gpa", e.target.value)}
                              placeholder="3.8/4.0"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {resumeData.education.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No education entries added yet. Click "Add Education" to get started.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addSkill()}
                      placeholder="Enter a skill and press Enter"
                    />
                    <Button onClick={addSkill}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                        {skill}
                        <button
                          onClick={() => removeSkill(index)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="other" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Projects</CardTitle>
                    <Button onClick={addProject} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(resumeData.projects || []).map((proj, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Project {index + 1}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProject(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Project Name *</Label>
                          <Input
                            value={proj.name}
                            onChange={(e) => updateProject(index, "name", e.target.value)}
                            placeholder="Project Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description *</Label>
                          <Textarea
                            value={proj.description}
                            onChange={(e) => updateProject(index, "description", e.target.value)}
                            placeholder="Describe the project..."
                            className="min-h-[100px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Technologies (comma-separated)</Label>
                            <Input
                              value={(proj.technologies || []).join(", ")}
                              onChange={(e) =>
                                updateProject(
                                  index,
                                  "technologies",
                                  e.target.value.split(",").map((t) => t.trim()).filter((t) => t)
                                )
                              }
                              placeholder="React, Node.js, MongoDB"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration</Label>
                            <Input
                              value={proj.duration || ""}
                              onChange={(e) => updateProject(index, "duration", e.target.value)}
                              placeholder="3 months"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Certifications</CardTitle>
                    <Button onClick={addCertification} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certification
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(resumeData.certifications || []).map((cert, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={cert}
                        onChange={(e) => updateCertification(index, e.target.value)}
                        placeholder="Certification name"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertification(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Languages</CardTitle>
                    <Button onClick={addLanguage} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Language
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(resumeData.languages || []).map((lang, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={lang}
                        onChange={(e) => updateLanguage(index, e.target.value)}
                        placeholder="Language name"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLanguage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Templates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showTemplates && (
        <ResumeTemplates
          originalResume={convertToResumeText()}
          optimizedResume={null}
          open={showTemplates}
          onOpenChange={setShowTemplates}
          profilePhotoUrl={profilePhotoUrl}
          userName={resumeData.personalInfo.name}
          userEmail={resumeData.personalInfo.email}
          userPhone={resumeData.personalInfo.phone}
          userLocation={resumeData.personalInfo.location}
          userLinkedIn={resumeData.personalInfo.linkedin}
          professionalTitle={resumeData.professionalTitle}
          structuredData={resumeData}
        />
      )}
    </>
  );
};

