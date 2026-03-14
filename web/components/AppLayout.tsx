import { Sidebar }                from "./Sidebar";
import { BottomNav }              from "./BottomNav";
import { PageTransitionWrapper }  from "./PageTransitionWrapper";

/**
 * Shared full-screen layout:
 *  - Desktop (≥768px): fixed 240px sidebar on the left
 *  - Mobile  (<768px): collapsible bottom navigation bar
 *
 * PageTransitionWrapper provides a smooth fade-in on every route change.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8F9FC" }}>
      {/* ── Desktop sidebar (hidden below md) ───────────── */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* ── Scrollable content ──────────────────────────── */}
      {/* pb-[70px] reserves space for the mobile bottom nav */}
      <main className="flex-1 overflow-y-auto pb-[70px] md:pb-0">
        <PageTransitionWrapper>
          {children}
        </PageTransitionWrapper>
      </main>

      {/* ── Mobile bottom nav (hidden above md) ─────────── */}
      <BottomNav />
    </div>
  );
}
