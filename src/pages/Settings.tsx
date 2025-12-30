import { Helmet } from "react-helmet-async";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  Bell,
  CreditCard,
  FileText,
  Upload,
  Save,
  Crown,
  Zap,
  Check,
  Loader2,
  X,
  File,
  Star,
  StarOff,
  Download,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PricingContainer, PricingPlan } from "@/components/ui/pricing-container";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  price: number;
  old_price: number | null;
  duration_days: number;
  billing_cycle_display: string | null;
  features: string[];
  is_active: boolean;
  is_recommended: boolean;
  button_text: string | null;
  button_disabled_text: string | null;
  sort_order: number;
  daily_limit: number;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  weeklySummary: boolean;
  responseAlerts: boolean;
}

interface Resume {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  version_name: string | null;
  is_primary: boolean;
  created_at: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    professionalTitle: "",
    bio: "",
    linkedinUrl: "",
    portfolioUrl: "",
    subscriptionTier: "FREE",
    profilePhotoUrl: "",
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    inAppNotifications: true,
    weeklySummary: true,
    responseAlerts: true,
  });

  const [signature, setSignature] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    fetchPlans();
    if (user?.id) {
      fetchProfile();
      fetchResumes();
    }
  }, [user?.id]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          location: data.location || "",
          professionalTitle: data.professional_title || "",
          bio: data.bio || "",
          linkedinUrl: data.linkedin_url || "",
          portfolioUrl: data.portfolio_url || "",
          subscriptionTier: data.subscription_tier || "FREE",
          profilePhotoUrl: data.profile_photo_url || "",
        });
        setSignature(`Best regards,\n${data.name || "Your Name"}\n${data.professional_title || ""}\n${data.email || ""}`);
        
        const prefs = data.preferences as any;
        if (prefs?.notifications) {
          setNotifications({
            emailNotifications: prefs.notifications.emailNotifications ?? true,
            inAppNotifications: prefs.notifications.inAppNotifications ?? true,
            weeklySummary: prefs.notifications.weeklySummary ?? true,
            responseAlerts: prefs.notifications.responseAlerts ?? true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const { data, error } = await supabase
        .from("user_resumes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
    } finally {
      setLoadingResumes(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          phone: profile.phone,
          location: profile.location,
          professional_title: profile.professionalTitle,
          bio: profile.bio,
          linkedin_url: profile.linkedinUrl,
          portfolio_url: profile.portfolioUrl,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile saved successfully!");
    } catch (error: any) {
      toast.error("Failed to save profile: " + error.message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      await supabase.storage.from("avatars").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_photo_url: photoUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profilePhotoUrl: photoUrl });
      toast.success("Profile photo updated!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const uploadResumeFile = async (file: File) => {
    if (!user?.id) return;

    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingResume(true);
    try {
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `${user.id}/${timestamp}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      // Set as primary if it's the first resume
      const isPrimary = resumes.length === 0;

      const { error: insertError } = await supabase
        .from("user_resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          is_primary: isPrimary,
        });

      if (insertError) throw insertError;

      toast.success("Resume uploaded successfully!");
      fetchResumes();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload resume: " + error.message);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      await uploadResumeFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await uploadResumeFile(file);
    }
  }, [user?.id, resumes.length]);

  const handleSetPrimary = async (resumeId: string) => {
    if (!user?.id) return;

    try {
      // First, unset all primary
      await supabase
        .from("user_resumes")
        .update({ is_primary: false })
        .eq("user_id", user.id);

      // Then set the selected one as primary
      const { error } = await supabase
        .from("user_resumes")
        .update({ is_primary: true })
        .eq("id", resumeId);

      if (error) throw error;
      toast.success("Primary resume updated!");
      fetchResumes();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    }
  };

  const handleDeleteResume = async (resumeId: string, fileUrl: string) => {
    if (!user?.id) return;

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split("/resumes/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("resumes").remove([filePath]);
      }

      const { error } = await supabase
        .from("user_resumes")
        .delete()
        .eq("id", resumeId);

      if (error) throw error;
      toast.success("Resume deleted!");
      fetchResumes();
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user?.id) return;

    setSavingNotifications(true);
    try {
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();

      const currentPrefs = (currentProfile?.preferences as any) || {};
      const updatedPrefs = {
        ...currentPrefs,
        notifications: notifications,
      };

      const { error } = await supabase
        .from("profiles")
        .update({ preferences: updatedPrefs })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Notification preferences saved!");
    } catch (error: any) {
      toast.error("Failed to save preferences: " + error.message);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleUpgradePlan = async (plan: SubscriptionPlan) => {
    if (!user?.id || plan.price === 0) return;

    setProcessingPayment(plan.id);
    try {
      // Get Supabase session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please log in to continue");
      }

      // Create Razorpay order via edge function
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            plan_id: plan.id,
            amount: plan.price,
          },
        }
      );

      if (orderError) {
        console.error("Order creation error:", orderError);
        const errorMessage = orderError.message || "Failed to create order";
        if (errorMessage.includes("Payment gateway not configured")) {
          throw new Error("Payment system is not configured. Please contact support.");
        }
        throw new Error(errorMessage);
      }

      if (!orderData?.order_id) {
        throw new Error("Failed to create order: Invalid response from server");
      }

      // Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "JobSeeker",
        description: `${plan.display_name || plan.name} Plan Subscription`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          // Verify payment on backend
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );

            if (verifyError) {
              throw new Error(verifyError.message || "Payment verification failed");
            }

            if (verifyData?.success) {
              toast.success(`Successfully upgraded to ${plan.display_name || plan.name}!`);
              setProfile((prev) => ({
                ...prev,
                subscriptionTier: verifyData.subscription_tier,
              }));
              fetchProfile();
            }
          } catch (err: any) {
            console.error("Verification error:", err);
            toast.error("Payment verification failed. Please contact support.");
          }
          setProcessingPayment(null);
        },
        prefill: {
          name: profile.name,
          email: profile.email,
          contact: profile.phone,
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to initiate payment");
      setProcessingPayment(null);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "₹0";
    return `₹${price.toLocaleString()}`;
  };

  const getAccentColor = (planName: string, index: number) => {
    const name = planName.toLowerCase();
    if (name.includes('free')) return 'bg-gray-500';
    if (name.includes('pro max') || name.includes('pro_max')) return 'bg-purple-500';
    if (name.includes('pro')) return 'bg-blue-500';
    // Default colors based on index
    const colors = ['bg-rose-500', 'bg-blue-500', 'bg-purple-500'];
    return colors[index % colors.length];
  };

  // Convert subscription plans to pricing plans format for Settings
  const convertToPricingPlans = (): PricingPlan[] => {
    return plans.map((plan, index) => {
      const monthlyPrice = plan.price;
      // Calculate yearly price (assuming 30 days = 1 month, so 12 months = 360 days)
      // If duration is 0 (forever) or price is 0, keep it as 0
      const yearlyPrice = (plan.price === 0 || plan.duration_days === 0) 
        ? 0 
        : (plan.duration_days === 30 ? monthlyPrice * 12 : monthlyPrice * 12);
      const isCurrent = profile.subscriptionTier === plan.id;
      
      return {
        id: plan.id,
        name: plan.display_name || plan.name,
        monthlyPrice: monthlyPrice,
        yearlyPrice: yearlyPrice > 0 ? Math.round(yearlyPrice * 0.8) : 0, // 20% discount for yearly
        features: plan.features || [],
        isPopular: plan.is_recommended || false,
        accent: getAccentColor(plan.name, index),
        isCurrent: isCurrent,
        buttonText: isCurrent 
          ? (plan.button_disabled_text || "Current Plan")
          : (plan.button_text || "Upgrade"),
        onButtonClick: () => {
          if (!isCurrent && plan.price > 0) {
            handleUpgradePlan(plan);
          }
        },
        disabled: isCurrent || processingPayment === plan.id || plan.price === 0,
        loading: processingPayment === plan.id,
      };
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPlanIcon = (index: number, isRecommended: boolean) => {
    if (isRecommended) return <Zap className="h-5 w-5 text-accent" />;
    if (index === 0) return <Zap className="h-5 w-5 text-muted-foreground" />;
    return <Crown className="h-5 w-5 text-warning" />;
  };

  return (
    <>
      <Helmet>
        <title>Settings | JobSeeker</title>
        <meta name="description" content="Manage your account settings and preferences" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">Settings</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your account</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <Tabs defaultValue="profile" className="space-y-8">
            <TabsList className="bg-card/50 border border-border/50 p-1">
              <TabsTrigger value="profile" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="resume" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <FileText className="h-4 w-4 mr-2" />
                Resume
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="subscription" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                <CreditCard className="h-4 w-4 mr-2" />
                Subscription
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>Profile Photo</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.profilePhotoUrl} />
                      <AvatarFallback className="bg-accent/20 text-accent text-2xl">
                        {profile.name.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your profile details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Full Name</label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Email</label>
                        <Input
                          value={profile.email}
                          disabled
                          className="bg-background/50 opacity-60"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Phone</label>
                        <Input
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Location</label>
                        <Input
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Professional Title</label>
                      <Input
                        value={profile.professionalTitle}
                        onChange={(e) => setProfile({ ...profile, professionalTitle: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Bio</label>
                      <Textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        className="bg-background/50 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">LinkedIn URL</label>
                        <Input
                          value={profile.linkedinUrl}
                          onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Portfolio URL</label>
                        <Input
                          value={profile.portfolioUrl}
                          onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                    <Button variant="hero" onClick={handleSaveProfile}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Email Signature</CardTitle>
                    <CardDescription>Your signature will be appended to all emails</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      className="bg-background/50 resize-none font-mono text-sm"
                      rows={5}
                    />
                    <Button variant="outline" onClick={() => toast.success("Signature saved!")}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Signature
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Resume Tab */}
            <TabsContent value="resume">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>Resume Management</CardTitle>
                    <CardDescription>Upload and manage multiple resume versions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      multiple
                      className="hidden"
                    />
                    
                    {/* Drag and Drop Zone */}
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                        isDragging 
                          ? "border-accent bg-accent/10" 
                          : "border-border/50 hover:border-accent/50"
                      }`}
                      onClick={() => resumeInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <FileText className={`h-12 w-12 mx-auto mb-4 ${isDragging ? "text-accent" : "text-muted-foreground"}`} />
                      <h3 className="text-lg font-medium mb-2">
                        {isDragging ? "Drop your resume here" : "Drag & drop your resume"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to browse • PDF or DOCX, max 5MB
                      </p>
                      <Button variant="hero" disabled={uploadingResume}>
                        {uploadingResume ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {uploadingResume ? "Uploading..." : "Choose Files"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Resume List */}
                {loadingResumes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  </div>
                ) : resumes.length > 0 ? (
                  <Card className="border-border/50 bg-card/50">
                    <CardHeader>
                      <CardTitle>Your Resumes ({resumes.length})</CardTitle>
                      <CardDescription>Click the star to set as primary resume for email attachments</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {resumes.map((resume) => (
                        <div
                          key={resume.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                            resume.is_primary 
                              ? "border-accent bg-accent/5" 
                              : "border-border/50 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${resume.is_primary ? "bg-accent/20" : "bg-muted"}`}>
                              <File className={`h-5 w-5 ${resume.is_primary ? "text-accent" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{resume.file_name}</p>
                                {resume.is_primary && (
                                  <Badge className="bg-accent text-accent-foreground text-xs">Primary</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(resume.file_size)} • Uploaded {new Date(resume.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSetPrimary(resume.id)}
                              title={resume.is_primary ? "Primary resume" : "Set as primary"}
                            >
                              {resume.is_primary ? (
                                <Star className="h-4 w-4 text-accent fill-accent" />
                              ) : (
                                <StarOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(resume.file_url, "_blank")}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteResume(resume.id, resume.file_url)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
              </motion.div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose how you want to be notified</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      { key: "emailNotifications", label: "Email Notifications", description: "Receive updates via email" },
                      { key: "inAppNotifications", label: "In-App Notifications", description: "Show notifications in the app" },
                      { key: "weeklySummary", label: "Weekly Summary", description: "Get a weekly summary of your activity" },
                      { key: "responseAlerts", label: "Response Alerts", description: "Get notified when recruiters respond" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <Switch
                          checked={notifications[item.key as keyof typeof notifications]}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, [item.key]: checked })
                          }
                        />
                      </div>
                    ))}
                    <Button variant="hero" onClick={handleSaveNotifications} disabled={savingNotifications}>
                      {savingNotifications && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {loadingPlans ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  </div>
                ) : (
                  <div className="bg-background rounded-lg p-4">
                    <PricingContainer
                      title="Subscription Plans"
                      plans={convertToPricingPlans()}
                      className="bg-transparent min-h-0"
                      showYearlyToggle={true}
                    />
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
};

export default Settings;
