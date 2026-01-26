
import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const useTour = () => {
    const driverObj = useRef<any>(null);

    useEffect(() => {
        driverObj.current = driver({
            showProgress: true,
            animate: true,
            steps: [
                {
                    element: "#dashboard-welcome",
                    popover: {
                        title: "Welcome to JobSeeker! 👋",
                        description: "Let's get you set up and ready to land your dream job. Follow this quick guide to get started.",
                        side: "bottom",
                        align: "start",
                    },
                },
                {
                    element: "#onboarding-progress",
                    popover: {
                        title: "Track Your Progress",
                        description: "Follow these steps to set up your account. Connecting Gmail is the most important step!",
                        side: "bottom",
                        align: "start",
                    },
                },
                {
                    element: "#quick-action-compose",
                    popover: {
                        title: "Start Outreach",
                        description: "Use the Compose page to find recruiters and send personalized emails.",
                        side: "top",
                        align: "start",
                    },
                },
                {
                    element: "#quick-action-recruiters",
                    popover: {
                        title: "Find Recruiters",
                        description: "Browse our database of recruiters to find the right contacts for your job search.",
                        side: "top",
                        align: "start",
                    },
                },
            ],
            onDestroyed: () => {
                localStorage.setItem("hasSeenTour", "true");
            },
        });
    }, []);

    const startTour = () => {
        const hasSeenTour = localStorage.getItem("hasSeenTour");
        if (!hasSeenTour) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                driverObj.current?.drive();
            }, 1000);
        }
    };

    const restartTour = () => {
        driverObj.current?.drive();
    };

    return { startTour, restartTour };
};
