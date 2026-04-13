/**
 * @fileoverview Sticky top navigation bar used on secondary landing pages
 * (e.g. /about, /faq). The hero page uses its own inline nav; this component
 * provides consistent navigation with in-page hash links via `HomeSectionLink`.
 */

import { Link } from "react-router-dom";
import { HomeSectionLink } from "@/components/landing/HomeSectionLink";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";

/** Sticky navbar with logo, section links, sign-in/sign-up CTAs, and responsive desktop layout. */
const Navbar = () => {
    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-sm">
                        <Mail className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <span className="text-xl font-bold text-foreground">JobSeeker</span>
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    <HomeSectionLink sectionId="features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Features
                    </HomeSectionLink>
                    <HomeSectionLink sectionId="pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Pricing
                    </HomeSectionLink>
                    <Link to="/government-jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Govt. Jobs
                    </Link>
                    <Link to="/apply-latest-jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Private jobs
                    </Link>
                    <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Blog
                    </Link>
                    <Link to="/faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        FAQ
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/auth">
                        <Button variant="ghost" size="sm">
                            Sign In
                        </Button>
                    </Link>
                    <Link to="/auth?mode=signup">
                        <Button size="sm" className="gap-2">
                            Sign Up <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
