import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Chrome } from "lucide-react";
import { Helmet } from "react-helmet-async";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  useEffect(() => {
    // Handle OAuth callback - check for tokens in URL hash
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken) {
        // OAuth callback detected - Supabase should handle this automatically
        // but we'll explicitly get the session to ensure it's processed
        setLoading(true);
        
        try {
          // Get session (this will process the hash tokens)
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("OAuth callback error:", error);
            toast.error("Failed to complete sign in. Please try again.");
            // Clear the hash
            window.history.replaceState({}, document.title, window.location.pathname);
            setLoading(false);
            return;
          }
          
          if (session) {
            // Clear the hash from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            toast.success("Signed in successfully!");
            navigate("/dashboard");
          }
        } catch (error: any) {
          console.error("OAuth callback processing error:", error);
          toast.error("Failed to complete sign in. Please try again.");
          // Clear the hash
          window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Check for existing session (normal flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate("/dashboard");
        }
      });
    };

    handleOAuthCallback();

    // Listen for auth changes (handles OAuth callbacks automatically)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only show toast if not already navigating from OAuth callback
        if (!window.location.hash.includes('access_token')) {
          toast.success("Signed in successfully!");
        }
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Redirect to dashboard after OAuth
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
      // Note: User will be redirected to Google, then back to redirectUrl
      // Loading state will be handled by auth state change or OAuth callback handler
    } catch (error: any) {
      console.error("Google OAuth error:", error);
      toast.error(error.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: formData.name,
            },
          },
        });
        
        if (error) throw error;
        toast.success("Account created! You can now sign in.");
        setIsLogin(true);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      
      // Handle specific error messages
      if (error.message.includes("User already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{isLogin ? "Sign In" : "Sign Up"} - JobSeeker</title>
        <meta name="description" content="Access your JobSeeker account to manage your job search and recruiter outreach." />
      </Helmet>
      
      <div className="min-h-screen flex">
        {/* Left Side - Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            {/* Back Button */}
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to home</span>
            </Link>
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow">
                  <Mail className="w-5 h-5 text-accent-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">JobSeeker</span>
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-muted-foreground">
                {isLogin 
                  ? "Enter your credentials to access your account" 
                  : "Start your journey to landing your dream job"
                }
              </p>
            </motion.div>
            
            {/* Google Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-5"
            >
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <Chrome className="w-5 h-5 mr-2" />
                {loading ? "Connecting..." : `Continue with Google`}
              </Button>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative my-6"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-muted-foreground">Or continue with email</span>
              </div>
            </motion.div>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label htmlFor="name" className="text-foreground">Full Name</Label>
                    <div className="relative mt-2">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="pl-10 h-12 bg-secondary/50 border-border focus:border-accent"
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div>
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 h-12 bg-secondary/50 border-border focus:border-accent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 h-12 bg-secondary/50 border-border focus:border-accent"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {isLogin && (
                <div className="flex justify-end">
                  <button type="button" className="text-sm text-accent hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}
              
              <Button
                type="submit"
                variant="hero"
                size="xl"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </motion.form>
            
            {/* Toggle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 text-center"
            >
              <p className="text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-accent font-semibold hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </motion.div>
          </div>
        </div>
        
        {/* Right Side - Decorative */}
        <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-primary/30 blur-3xl" />
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center px-12"
          >
            <div className="w-24 h-24 rounded-3xl bg-accent/20 backdrop-blur-xl flex items-center justify-center mx-auto mb-8 border border-accent/30">
              <Mail className="w-12 h-12 text-accent" />
            </div>
            <h2 className="text-3xl font-bold text-primary-foreground mb-4">
              Supercharge Your Job Search
            </h2>
            <p className="text-primary-foreground/70 text-lg max-w-md">
              Join thousands of job seekers who have landed their dream roles using our AI-powered outreach platform.
            </p>
            
            {/* Stats */}
            <div className="flex justify-center gap-12 mt-12">
              <div>
                <div className="text-3xl font-bold text-accent">45%</div>
                <div className="text-sm text-primary-foreground/60">Response Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">10k+</div>
                <div className="text-sm text-primary-foreground/60">Happy Users</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Auth;
