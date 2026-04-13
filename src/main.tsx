/**
 * @file main.tsx
 * Application entry point. Mounts the root React component and disables
 * the browser's automatic scroll restoration so the app can manage it.
 */

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Disable browser-managed scroll restoration — the app handles scroll position
// itself to avoid jarring jumps during SPA navigation.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

createRoot(document.getElementById("root")!).render(<App />);
