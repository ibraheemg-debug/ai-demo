"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LayoutDashboard, CreditCard, Zap } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_ITEMS = [
  { href: "/dashboard" as const, icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/billing"   as const, icon: CreditCard,      labelKey: "billing"   as const },
];

export function Sidebar() {
  const locale   = useLocale();
  const t        = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside
      className="flex h-screen w-[240px] flex-shrink-0 flex-col"
      style={{ background: "#FFFFFF", borderRight: "1px solid #E5E7EB" }}
    >
      {/* ── Logo ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-6">
        {/* Logo icon */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
          }}
        >
          <span className="text-sm font-bold text-white">N</span>
        </div>
        <div>
          <span className="block text-sm font-bold leading-none tracking-tight" style={{ color: "#111827" }}>
            NovaMind
          </span>
          <span className="block text-[10px] font-medium tracking-widest" style={{ color: "#6B7280" }}>
            AI Platform
          </span>
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="mx-5 mb-5" style={{ height: "1px", background: "#E5E7EB" }} />

      {/* ── Nav items ──────────────────────────────────────── */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const isActive = pathname === href || pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              locale={locale}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive
                  ? "nav-active"
                  : "hover:bg-[#F3F4F8]"
                }`}
              style={{
                color: isActive ? "#6366F1" : "#6B7280",
              }}
            >
              <Icon
                className="h-4 w-4 transition-colors"
                style={{ color: isActive ? "#6366F1" : "#9CA3AF" }}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* ── Spacer ─────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Divider ────────────────────────────────────────── */}
      <div className="mx-5 mb-4" style={{ height: "1px", background: "#E5E7EB" }} />

      {/* ── Language ───────────────────────────────────────── */}
      <div className="px-5 pb-4">
        <LanguageSwitcher />
      </div>

      {/* ── Powered by Grok badge ───────────────────────────── */}
      <div className="px-5 pb-6">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "#F8F9FC" }}>
          <span className="text-xs" style={{ color: "#6B7280" }}>Powered by</span>
          <span className="text-xs font-semibold" style={{ color: "#111827" }}>Grok</span>
        </div>
      </div>
    </aside>
  );
}
