
import { motion } from "framer-motion";

export const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative flex flex-col items-center gap-4">
                <motion.div
                    className="relative h-16 w-16"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.span
                        className="absolute inset-0 rounded-full border-4 border-accent/20"
                        style={{ borderTopColor: "transparent" }}
                    />
                    <motion.span
                        className="absolute inset-0 rounded-full border-4 border-accent"
                        style={{ borderTopColor: "transparent" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute inset-2 rounded-full bg-accent/10 flex items-center justify-center"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <div className="h-3 w-3 rounded-full bg-accent" />
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center gap-1"
                >
                    <h3 className="text-lg font-medium text-foreground tracking-tight">JobSeeker</h3>
                    <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
                </motion.div>
            </div>
        </div>
    );
};
