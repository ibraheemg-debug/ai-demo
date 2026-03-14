"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Cpu, Wifi, Zap, CreditCard } from "lucide-react";

export interface FeedEntry {
  id:        string;
  type:      "tokens" | "requests" | "connection" | "session";
  message:   string;
  timestamp: number; // ms since epoch
}

interface ActivityFeedProps {
  entries: FeedEntry[];
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5)  return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const ICON_MAP = {
  tokens:     { Icon: Cpu,        color: "#A78BFA" },
  requests:   { Icon: Zap,        color: "#818CF8" },
  connection: { Icon: Wifi,       color: "#34D399" },
  session:    { Icon: CreditCard, color: "#FCD34D" },
};

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const [, setTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Re-render every 5 s to refresh relative timestamps
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background:  "#FFFFFF",
        border:      "1px solid #E5E7EB",
        boxShadow:   "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: "#111827" }}>Activity Feed</h3>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: "#ECFDF5", color: "#10B981" }}
        >
          LIVE
        </span>
      </div>

      {/* Feed list */}
      <div ref={listRef} className="flex flex-col" style={{ maxHeight: 280, overflowY: "auto" }}>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "#9CA3AF" }}>
            Waiting for activity…
          </p>
        ) : (
          entries.map((entry, i) => {
            const { Icon, color } = ICON_MAP[entry.type];
            const isNew = i === 0;
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-3 px-3 py-2.5 ${isNew ? "feed-in" : ""}`}
                style={{ 
                  background: i % 2 === 0 ? "#FFFFFF" : "#F9FAFB",
                }}
              >
                {/* Colored dot */}
                <div
                  className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                  style={{ background: color }}
                />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: "#374151" }}>{entry.message}</p>
                </div>

                {/* Time */}
                <span className="flex-shrink-0 text-xs" style={{ color: "#9CA3AF" }}>
                  {timeAgo(entry.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
