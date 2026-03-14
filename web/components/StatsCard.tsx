import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

export type GlowVariant = "blue" | "purple" | "green";

interface StatsCardProps {
  label:  string;
  value:  number;
  icon:   LucideIcon;
  glow:   GlowVariant;
  delta?: string;
}

const GLOW_STYLES: Record<GlowVariant, {
  border:     string;
  iconBg:     string;
  iconColor:  string;
  accent:     string;
}> = {
  blue: {
    border:    "#E5E7EB",
    iconBg:    "#EEF2FF",
    iconColor: "#6366F1",
    accent:    "#6366F1",
  },
  purple: {
    border:    "#E5E7EB",
    iconBg:    "#F5F3FF",
    iconColor: "#8B5CF6",
    accent:    "#8B5CF6",
  },
  green: {
    border:    "#E5E7EB",
    iconBg:    "#ECFDF5",
    iconColor: "#10B981",
    accent:    "#10B981",
  },
};

const BASE_SHADOW: Record<GlowVariant, string> = {
  blue:   "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  purple: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  green:  "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
};

// ── Card ──────────────────────────────────────────────────────
export function StatsCard({ label, value, icon: Icon, glow, delta }: StatsCardProps) {
  const { value: animated, flashing } = useCountUp(value);
  const styles = GLOW_STYLES[glow];

  return (
    <div
      className={`stat-card stat-card-${glow} relative overflow-hidden rounded-xl p-6`}
      style={{
        background: "#FFFFFF",
        border:     `1px solid ${styles.border}`,
        boxShadow:  BASE_SHADOW[glow],
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: styles.iconBg }}
        >
          <Icon className="h-5 w-5" style={{ color: styles.iconColor }} strokeWidth={2} />
        </div>

        {delta && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: styles.iconBg, color: styles.iconColor }}
          >
            {delta}
          </span>
        )}
      </div>

      {/* Animated number */}
      <p
        key={animated}
        className={`mt-5 text-[36px] font-bold tabular-nums tracking-tight ${flashing ? "number-flash" : ""}`}
        style={{ color: "#111827" }}
      >
        {animated.toLocaleString()}
      </p>

      {/* Label + trend indicator */}
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#6B7280", letterSpacing: "0.05em" }}>
          {label}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: "#10B981" }}>↑</span>
          <span className="text-xs font-medium" style={{ color: "#10B981" }}>Live</span>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-6"
      style={{
        background: "#FFFFFF",
        border:     "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Icon placeholder */}
      <div
        className="h-10 w-10 animate-pulse rounded-lg"
        style={{ background: "#F3F4F8" }}
      />

      {/* Number placeholder */}
      <div
        className="mt-5 h-9 w-28 animate-pulse rounded-lg"
        style={{ background: "#F3F4F8" }}
      />

      {/* Label placeholder */}
      <div
        className="mt-2 h-4 w-20 animate-pulse rounded"
        style={{ background: "#F3F4F8" }}
      />
    </div>
  );
}
