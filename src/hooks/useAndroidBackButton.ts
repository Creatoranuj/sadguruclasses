import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

const EXIT_ROUTES = ["/dashboard", "/"];
const AUTH_ROUTES = ["/login", "/signup", "/admin/login", "/admin/register"];

export const useAndroidBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const lastBackRef = useRef(0);
  const pathRef = useRef(location.pathname);
  const authRef = useRef(isAuthenticated);
  const navRef = useRef(navigate);

  // Keep refs in sync without re-running the effect
  pathRef.current = location.pathname;
  authRef.current = isAuthenticated;
  navRef.current = navigate;

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      try {
        const pkg = "@capacitor/app";
        const { App } = await import(/* @vite-ignore */ pkg);

        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          const path = pathRef.current;

          if (authRef.current && AUTH_ROUTES.includes(path)) {
            navRef.current("/dashboard", { replace: true });
            return;
          }

          if (EXIT_ROUTES.includes(path)) {
            const now = Date.now();
            if (now - lastBackRef.current < 2000) {
              App.exitApp();
            } else {
              lastBackRef.current = now;
              toast("Press back again to exit", { duration: 2000 });
            }
            return;
          }

          if (canGoBack) {
            window.history.back();
          } else {
            navRef.current("/dashboard", { replace: true });
          }
        });

        cleanup = () => listener.remove();
      } catch {
        // Not running on Capacitor — silently skip
      }
    };

    setup();
    return () => cleanup?.();
  }, []); // Runs only once on mount
};
