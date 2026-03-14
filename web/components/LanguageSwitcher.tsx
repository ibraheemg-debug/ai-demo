"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { ChevronDown, Check } from "lucide-react";

const LOCALES = [
  { code: "en", name: "English",  flag: "🇺🇸" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
] as const;

export function LanguageSwitcher() {
  const locale   = useLocale();
  const t        = useTranslations("nav");
  const router   = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSelect(code: string) {
    router.push(pathname, { locale: code });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
        style={{
          background: open ? "#EEF2FF" : "#FFFFFF",
          border:     `1px solid ${open ? "#6366F1" : "#E5E7EB"}`,
          color:      open ? "#6366F1" : "#374151",
        }}
      >
        <span aria-hidden="true" className="text-base">{current.flag}</span>
        <span className="flex-1 text-start">{current.name}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: open ? "#6366F1" : "#6B7280" }}
        />
      </button>

      {/* Dropdown — renders above the trigger in the sidebar */}
      {open && (
        <div
          role="listbox"
          className="absolute bottom-full end-0 start-0 mb-2 rounded-lg py-1"
          style={{
            background: "#FFFFFF",
            border:     "1px solid #E5E7EB",
            boxShadow:  "0 4px 24px rgba(0,0,0,0.1)",
            zIndex:     100,
          }}
        >
          {LOCALES.map((loc) => {
            const isActive = loc.code === locale;
            return (
              <button
                key={loc.code}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(loc.code)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors"
                style={{
                  background: isActive ? "#EEF2FF" : "transparent",
                  color:      isActive ? "#6366F1" : "#374151",
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#F3F4F8"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span aria-hidden="true" className="text-base">{loc.flag}</span>
                <span className="flex-1 text-start">{loc.name}</span>
                {isActive && <Check className="h-3.5 w-3.5" style={{ color: "#6366F1" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
