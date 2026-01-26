
import { Check, Mail, User, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingProgressProps {
    isGmailConnected: boolean;
    hasTemplates: boolean;
    hasSentEmail: boolean;
    className?: string;
    onDismiss?: () => void;
}

export function OnboardingProgress({
    isGmailConnected,
    hasTemplates,
    hasSentEmail,
    className,
    onDismiss
}: OnboardingProgressProps) {
    const steps = [
        {
            id: "signup",
            label: "Create Account",
            completed: true,
            icon: User,
            link: null,
            action: "Done"
        },
        {
            id: "gmail",
            label: "Connect Gmail",
            completed: isGmailConnected,
            icon: Mail,
            link: "/compose",
            action: "Connect"
        },
        {
            id: "template",
            label: "Create a Template",
            completed: hasTemplates,
            icon: FileText,
            link: "/templates",
            action: "Create"
        },
        {
            id: "send",
            label: "Send First Email",
            completed: hasSentEmail,
            icon: ArrowRight,
            link: "/compose",
            action: "Send"
        }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const progress = (completedCount / steps.length) * 100;

    if (progress === 100) return null;

    return (
        <Card className={cn("border-accent/20 bg-accent/5 overflow-hidden", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        Setup Progress
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            {completedCount}/{steps.length} completed
                        </span>
                    </CardTitle>
                    {progress > 0 && (
                        <span className="text-xs text-muted-foreground font-mono">{Math.round(progress)}%</span>
                    )}
                </div>
                <Progress value={progress} className="h-2 mt-2" indicatorClassName="bg-accent" />
                <CardDescription className="pt-2">
                    Complete these steps to unlock your full potential and start getting interviews.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                step.completed
                                    ? "bg-success/10 border-success/20"
                                    : "bg-background border-border hover:border-accent/30"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                    step.completed ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    {step.completed ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <step.icon className="w-4 h-4" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "text-sm font-medium",
                                        step.completed && "text-muted-foreground line-through"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>
                            </div>

                            {!step.completed && step.link && (
                                <Link to={step.link}>
                                    <Button variant="outline" size="sm" className="h-7 text-xs">
                                        {step.action}
                                    </Button>
                                </Link>
                            )}
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
