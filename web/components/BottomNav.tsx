"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LayoutDashboard, CreditCard, Globe, Check, X } from "lucide-react";

const LOCALES = [
  { code: "en", name: "English",  flag: "🇺🇸" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
] as const;

const NAV_TABS = [
  { href: "/dashboard" as const, icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/billing"   as const, icon: CreditCard,      labelKey: "billing"   as const },
] as const;

export function BottomNav() {
  const locale   = useLocale();
  const t        = useTranslations("nav");
  const pathname = usePathname();
  const router   = useRouter();

  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef  = useRef<HTMLDivElement>(null);

  // Close sheet on outside tap
  useEffect(() => {
    if (!sheetOpen) return;
    function onTap(e: MouseEvent | TouchEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setSheetOpen(false);
      }
    }
    document.addEventListener("mousedown", onTap);
    document.addEventListener("touchstart", onTap);
    return () => {
      document.removeEventListener("mousedown", onTap);
      document.removeEventListener("touchstart", onTap);
    };
  }, [sheetOpen]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  function handleLocaleChange(code: string) {
    router.push(pathname, { locale: code });
    setSheetOpen(false);
  }

  return (
    <>
      {/* ── Fixed bottom navigation bar ──────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bottom-nav-safe"
        style={{
          background:  "#FFFFFF",
          borderTop:   "1px solid #E5E7EB",
        }}
      >
        <div className="flex items-center">
          {/* Dashboard + Billing tabs */}
          {NAV_TABS.map(({ href, icon: Icon, labelKey }) => {
            const isActive = pathname === href || pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                locale={locale}
                className="touch-target flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors"
                style={{ color: isActive ? "#6366F1" : "#9CA3AF" }}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[10px] font-semibold tracking-wide">
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}

          {/* Language tab */}
          <button
            onClick={() => setSheetOpen(true)}
            className="touch-target flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors"
            style={{ color: sheetOpen ? "#6366F1" : "#9CA3AF" }}
            aria-label={t("language")}
          >
            <Globe className="h-5 w-5" strokeWidth={2} />
            <span className="text-[10px] font-semibold tracking-wide">
              {LOCALES.find((l) => l.code === locale)?.flag ?? "🌐"}
            </span>
          </button>
        </div>
      </nav>

      {/* ── Language sheet backdrop ───────────────────────── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        />
      )}

      {/* ── Language bottom sheet ─────────────────────────── */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 z-[70] md:hidden transition-transform duration-300 ease-out"
        style={{
          bottom:    0,
          transform: sheetOpen ? "translateY(0)" : "translateY(110%)",
        }}
      >
        <div
          className="rounded-t-2xl px-5 pb-6 pt-4 bottom-nav-safe"
          style={{
            background: "#FFFFFF",
            border:     "1px solid #E5E7EB",
            borderBottom: "none",
            boxShadow:  "0 -8px 40px rgba(0,0,0,0.1)",
          }}
        >
          {/* Drag handle + close */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4" style={{ color: "#6366F1" }} />
              <p className="text-sm font-bold" style={{ color: "#111827" }}>{t("language")}</p>
            </div>
            <button
              onClick={() => setSheetOpen(false)}
              className="touch-target flex items-center justify-center rounded-full transition-colors hover:bg-[#F3F4F8]"
            >
              <X className="h-4 w-4" style={{ color: "#6B7280" }} />
            </button>
          </div>

          {/* Divider */}
          <div className="mb-4" style={{ height: "1px", background: "#E5E7EB" }} />

          {/* Locale options */}
          <div className="flex flex-col gap-2">
            {LOCALES.map((loc) => {
              const isActive = loc.code === locale;
              return (
                <button
                  key={loc.code}
                  onClick={() => handleLocaleChange(loc.code)}
                  className="touch-target flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors"
                  style={{
                    background: isActive
                      ? "#EEF2FF"
                      : "transparent",
                    border: isActive
                      ? "1px solid #6366F1"
                      : "1px solid #E5E7EB",
                    color: isActive ? "#6366F1" : "#374151",
                  }}
                >
                  <span className="text-2xl">{loc.flag}</span>
                  <span className="flex-1 text-sm font-semibold">{loc.name}</span>
                  {isActive && (
                    <Check className="h-4 w-4" style={{ color: "#6366F1" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
