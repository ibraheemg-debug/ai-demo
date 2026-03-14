"use client";

import { usePathname } from "@/i18n/navigation";

/**
 * Re-keys itself whenever the pathname changes, which re-mounts the div and
 * restarts the page-fade-in CSS animation for a smooth page-to-page transition.
 */
export function PageTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    // Using pathname as the key forces React to remount the wrapper on route
    // change, which restarts the CSS animation.
    <div key={pathname} className="page-fade-in min-h-full">
      {children}
    </div>
  );
}
