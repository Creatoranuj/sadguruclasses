import { supabase } from "@/integrations/supabase/client";

const ERROR_QUEUE: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 10_000; // batch every 10s
const MAX_QUEUE = 50;

async function flushErrors() {
  if (ERROR_QUEUE.length === 0) return;
  const batch = ERROR_QUEUE.splice(0, MAX_QUEUE);
  try {
    await supabase.from("error_logs").insert(batch as any);
  } catch {
    // silently fail — don't create error loops
  }
}

function enqueue(data: Record<string, unknown>) {
  // Deduplicate: skip if same message logged in last 5 entries
  const msg = data.message as string;
  if (ERROR_QUEUE.slice(-5).some((e) => e.message === msg)) return;

  ERROR_QUEUE.push(data);
  if (ERROR_QUEUE.length >= MAX_QUEUE) {
    flushErrors();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushErrors();
    }, FLUSH_INTERVAL);
  }
}

/** Initialize global error interceptors. Call once at app startup. */
export function initErrorLogger() {
  // Global JS errors
  window.addEventListener("error", (event) => {
    enqueue({
      error_type: "client_js",
      message: event.message || "Unknown error",
      stack_trace: event.error?.stack?.slice(0, 2000) || null,
      url: window.location.href,
      user_agent: navigator.userAgent,
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    enqueue({
      error_type: "client_js",
      message: reason?.message || String(reason) || "Unhandled rejection",
      stack_trace: reason?.stack?.slice(0, 2000) || null,
      url: window.location.href,
      user_agent: navigator.userAgent,
    });
  });

  // Flush on page unload
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushErrors();
  });
}
