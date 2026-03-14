"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navigation() {
  const t        = useTranslations("nav");
  const locale   = useLocale();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard" as const, label: t("dashboard"), icon: "📊" },
    { href: "/billing"   as const, label: t("billing"),   icon: "💳" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md" style={{ borderColor: "#E5E7EB" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo / brand */}
        <Link
          href="/dashboard"
          locale={locale}
          className="flex items-center gap-2 font-bold rtl:flex-row-reverse"
          style={{ color: "#111827" }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm font-black" style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" }}>
            AI
          </span>
          <span className="hidden sm:inline">Platform</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href || pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                locale={locale}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  background: isActive ? "#EEF2FF" : "transparent",
                  color: isActive ? "#6366F1" : "#6B7280",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "#F3F4F8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                <span aria-hidden="true">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Language switcher */}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
