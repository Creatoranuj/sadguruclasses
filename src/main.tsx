// Sadguru Coaching Classes - Main Entry Point
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

// Add class so CSS can apply native-specific rules (e.g. status-bar padding)
if (Capacitor.isNativePlatform()) {
  document.body.classList.add("capacitor-native");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
