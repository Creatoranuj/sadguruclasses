/**
 * Capacitor hardware back button handler for Android.
 * Navigates back in history, or minimizes app at root routes.
 */
import { Capacitor } from '@capacitor/core';

const ROOT_ROUTES = ['/', '/dashboard', '/login', '/signup', '/courses', '/my-courses'];

export function setupCapacitorBackButton(): (() => void) | undefined {
  if (!Capacitor.isNativePlatform()) return undefined;

  let handler: any;

  // Dynamic import to avoid bundling @capacitor/app for web
  import('@capacitor/app').then(({ App }) => {
    handler = App.addListener('backButton', ({ canGoBack }) => {
      const currentPath = window.location.pathname;

      if (ROOT_ROUTES.includes(currentPath)) {
        // At a root route → minimize the app (don't exit)
        App.minimizeApp();
      } else if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  }).catch(() => {
    // @capacitor/app not available
  });

  return () => {
    handler?.then?.((h: any) => h.remove?.());
  };
}
