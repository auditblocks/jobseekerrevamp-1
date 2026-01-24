import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    Home,
    Send,
    MessageSquare,
    Briefcase,
    Globe,
    Clock,
    FileText,
    Users,
    FileSearch,
    BarChart3,
    CreditCard,
    Settings,
    Shield,
    LogOut,
    Menu,
    X,
    Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";

interface DashboardLayoutProps {
    children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, profile, isSuperadmin, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isProUser = profile?.subscription_tier === "PRO" || profile?.subscription_tier === "PRO_MAX";

    const handleSignOut = async () => {
        await signOut();
        toast.success("Signed out successfully");
        navigate("/");
    };

    const navItems = [
        { icon: Home, label: "Dashboard", path: "/dashboard" },
        { icon: Send, label: "Compose", path: "/compose" },
        { icon: Mail, label: "Email History", path: "/email-history" },
        { icon: MessageSquare, label: "Conversations", path: "/conversations" },
        { icon: Briefcase, label: "Applications", path: "/applications" },
        { icon: Globe, label: "Apply Govt. Jobs", path: "/government-jobs" },
        { icon: Clock, label: "Govt. Job Tracker", path: "/govt-jobs/tracker" },
        { icon: FileText, label: "Templates", path: "/templates" },
        { icon: Users, label: "Recruiters", path: "/recruiters" },
        { icon: FileSearch, label: "Resume Optimizer", path: "/resume-optimizer", badge: isProUser ? "PRO" : "NEW" },
        { icon: BarChart3, label: "Analytics", path: "/analytics" },
        { icon: CreditCard, label: "Subscription", path: "/dashboard/subscription" },
        { icon: Settings, label: "Settings", path: "/settings" },
        ...(isSuperadmin ? [{ icon: Shield, label: "Admin Portal", path: "/admin" }] : []),
    ];

    // Close sidebar on navigation
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-2 px-6 py-6 border-b border-sidebar-border">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-glow cursor-pointer" onClick={() => navigate("/dashboard")}>
                            <Mail className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <span className="text-xl font-bold text-sidebar-foreground cursor-pointer" onClick={() => navigate("/dashboard")}>JobSeeker</span>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden ml-auto text-sidebar-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navItems.map((item, index) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={index}
                                    onClick={() => navigate(item.path)}
                                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left transition-colors ${isActive
                                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    {(item as any).badge && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${(item as any).badge === "PRO"
                                            ? 'bg-accent/20 text-accent'
                                            : 'bg-green-500/20 text-green-500'
                                            }`}>
                                            {(item as any).badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User Section */}
                    <div className="p-4 border-t border-sidebar-border">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/50">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                                <span className="text-accent-foreground font-semibold">
                                    {user?.email?.[0]?.toUpperCase() || "U"}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-sidebar-foreground truncate">
                                    {user?.user_metadata?.name || "User"}
                                </div>
                                <div className="text-xs text-sidebar-foreground/60 truncate">
                                    {user?.email}
                                </div>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-xl border-b border-border">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden text-foreground"
                        >
                            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <h1 className="text-lg sm:text-xl font-bold text-foreground">
                            {navItems.find(item => item.path === location.pathname)?.label || "Dashboard"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <NotificationBell />
                        {profile?.subscription_tier !== "PRO_MAX" && (
                            <Button
                                variant="accent"
                                size="sm"
                                className="text-xs sm:text-sm h-8 sm:h-10"
                                onClick={() => navigate("/dashboard/subscription")}
                            >
                                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">
                                    {profile?.subscription_tier === "PRO" ? "Upgrade to Pro Max" : "Upgrade to Pro"}
                                </span>
                                <span className="sm:hidden">Upgrade</span>
                            </Button>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
