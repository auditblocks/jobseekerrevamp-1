/**
 * @file useTour.tsx
 * Provides a guided product tour using Driver.js.
 *
 * Auto-start is tied to onboarding completion rather than a permanent "seen it once"
 * flag: as long as a user hasn't finished onboarding, the tour is eligible to reappear
 * (throttled to once per browser session via `sessionStorage`) so a user who dismissed
 * it mid-setup — or never got to Gmail/templates/first send — is reminded next time
 * they land on the dashboard, instead of the guide vanishing forever after one viewing.
 * Once onboarding is complete, auto-start stops; `restartTour` remains available for a
 * manual replay at any time (e.g. a "Take the tour" button).
 */

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_SHOWN_THIS_SESSION_KEY = "tourShownThisSession";

/**
 * Initialises a Driver.js tour instance and exposes `startTour` (auto-start, gated on
 * onboarding completion + once-per-session) and `restartTour` (manual replay, always runs).
 */
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
                        description: "Let's get you set up to use JobSeeker's outreach and application tools. Follow this quick guide to get started.",
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
                try {
                    sessionStorage.setItem(TOUR_SHOWN_THIS_SESSION_KEY, "true");
                } catch {
                    /* sessionStorage unavailable — worst case the tour can reopen this session */
                }
            },
        });
    }, []);

    /**
     * Auto-starts the tour once per browser session, but only while onboarding is
     * still incomplete. Pass the user's current onboarding-complete state each call.
     */
    const startTour = (hasCompletedOnboarding: boolean) => {
        if (hasCompletedOnboarding) return;

        let alreadyShownThisSession = false;
        try {
            alreadyShownThisSession = sessionStorage.getItem(TOUR_SHOWN_THIS_SESSION_KEY) === "true";
        } catch {
            /* ignore — treat as not shown */
        }
        if (alreadyShownThisSession) return;

        // Small delay to ensure DOM is ready
        setTimeout(() => {
            driverObj.current?.drive();
        }, 1000);
    };

    /** Manual replay — always runs, regardless of onboarding state or session flag. */
    const restartTour = () => {
        driverObj.current?.drive();
    };

    return { startTour, restartTour };
};
