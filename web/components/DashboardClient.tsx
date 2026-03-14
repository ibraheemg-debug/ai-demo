"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { io, Socket } from "socket.io-client";
import { Cpu, Shield, Users, RefreshCw, WifiOff } from "lucide-react";
import { StatsCard, StatCardSkeleton } from "./StatsCard";
import { ActivityFeed, type FeedEntry } from "./ActivityFeed";

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? "http://localhost:4000";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
const MAX_FEED   = 10;

type WsStatus = "connecting" | "connected" | "disconnected";

interface Stats {
  requests:          number;
  tokensUsed:        number;
  activeConnections: number;
  updatedAt:         string;
}

interface Message {
  id:        string;
  sender:    string;
  content:   string;
  aiSummary: string;
  status:    "pending";
}

// ── WS status badge ──────────────────────────────────────────
function WsBadge({ status }: { status: WsStatus }) {
  const map = {
    connecting:   { color: "#F59E0B", bg: "#FFFBEB", label: "Connecting" },
    connected:    { color: "#10B981", bg: "#ECFDF5", label: "WS Live"    },
    disconnected: { color: "#EF4444", bg: "#FEF2F2", label: "WS Offline" },
  };
  const { color, bg, label } = map[status];
  return (
    <span 
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ 
        background: bg,
        color: color,
      }}
    >
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{
            background: color,
            animation: status === "connected"
              ? "ping-slow 2s cubic-bezier(0,0,0.2,1) infinite"
              : "none",
          }}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

// ── WsToast ───────────────────────────────────────────────────
function WsToast({ show, message }: { show: boolean; message: string }) {
  return (
    <div
      aria-live="polite"
      className="fixed left-1/2 z-[80] -translate-x-1/2 transition-all duration-300"
      style={{
        bottom:    "calc(env(safe-area-inset-bottom, 0px) + 80px)",
        opacity:   show ? 1 : 0,
        transform: show
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(10px)",
        pointerEvents: show ? "auto" : "none",
      }}
    >
      <div
        className="flex items-center gap-2.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium shadow-xl"
        style={{
          background: "#FFFFFF",
          border:     "1px solid #EF4444",
          color:      "#EF4444",
        }}
      >
        <WifiOff className="h-3.5 w-3.5 flex-shrink-0" />
        {message}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function DashboardClient() {
  const t      = useTranslations("dashboard");
  const tErr   = useTranslations("errors");

  const [stats,    setStats]    = useState<Stats | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [loading,  setLoading]  = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [feed,     setFeed]     = useState<FeedEntry[]>([]);

  // toast visibility: show when disconnected, hide 3 s after reconnect
  const [showToast,    setShowToast]    = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevStats = useRef<Stats | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // ── Push activity feed entry ────────────────────────────────
  const pushFeed = useCallback((entry: Omit<FeedEntry, "id" | "timestamp">) => {
    setFeed((prev) => [
      { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
      ...prev.slice(0, MAX_FEED - 1),
    ]);
  }, []);

  // ── Apply stat update + feed ────────────────────────────────
  const applyStats = useCallback((next: Stats) => {
    const prev = prevStats.current;
    if (prev) {
      const dTokens   = next.tokensUsed        - prev.tokensUsed;
      const dRequests = next.requests          - prev.requests;
      const dConns    = next.activeConnections - prev.activeConnections;
      if (dTokens   > 0) pushFeed({ type: "tokens",     message: `+${dTokens.toLocaleString()} tokens consumed` });
      if (dRequests > 0) pushFeed({ type: "requests",   message: `+${dRequests} API request${dRequests > 1 ? "s" : ""} processed` });
      if (dConns !== 0)  pushFeed({ type: "connection", message: dConns > 0 ? `+${dConns} connection joined` : `${Math.abs(dConns)} connection left` });
    }
    prevStats.current = next;
    setStats(next);
    setApiError(null);
  }, [pushFeed]);

  // ── Initial REST fetch ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(`${API_URL}/api/stats`),
        fetch(`${API_URL}/api/messages`),
      ]);
      if (!sRes.ok || !mRes.ok) throw new Error(tErr("apiFailure"));

      const [sData, mData] = await Promise.all([
        sRes.json() as Promise<Stats>,
        mRes.json() as Promise<Message[]>,
      ]);
      applyStats(sData);
      setMessages(mData);
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [applyStats, tErr]);

  // ── Socket.io setup ─────────────────────────────────────────
  useEffect(() => {
    fetchData();

    const socket = io(SOCKET_URL, {
      transports:          ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay:   5_000,
      reconnectionDelayMax: 5_000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setWsStatus("connected");
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      // Hide toast 3 s after reconnecting
      reconnectTimer.current = setTimeout(() => setShowToast(false), 3_000);
    });

    socket.on("disconnect", () => {
      setWsStatus("disconnected");
      setShowToast(true);
    });

    socket.on("connect_error", () => {
      setWsStatus("disconnected");
      setShowToast(true);
    });

    socket.on("stats:update", (data: Stats) => {
      applyStats(data);
    });

    // Session lifecycle events from other clients
    socket.on("session:update", (data: {
      action:       "start" | "end";
      sessionId:    string;
      cost?:        number;
      durationSec?: number;
    }) => {
      if (data.action === "start") {
        pushFeed({ type: "session", message: "💳 New session started" });
      } else {
        const costStr = data.cost != null ? ` · $${data.cost.toFixed(2)} charged` : "";
        pushFeed({ type: "session", message: `💳 Session ended${costStr}` });
      }
    });

    return () => {
      socket.disconnect();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [fetchData, applyStats, pushFeed]);

  // ── Fallback poll every 10 s ────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchData();
    }, 10_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Loading state — skeleton UI ─────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col">
        {/* Skeleton top bar */}
        <div
          className="sticky top-0 z-20 flex h-[64px] items-center justify-between px-4 sm:px-8"
          style={{
            background:  "#FFFFFF",
            borderBottom:"1px solid #E5E7EB",
          }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="h-5 w-40 animate-pulse rounded-lg" style={{ background: "#F3F4F8" }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-5 w-12 animate-pulse rounded-full" style={{ background: "#ECFDF5" }} />
            <div className="h-5 w-20 animate-pulse rounded-full" style={{ background: "#F3F4F8" }} />
          </div>
        </div>

        {/* Skeleton cards */}
        <div className="grid grid-cols-1 gap-5 px-4 py-7 sm:grid-cols-2 sm:px-8 xl:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Full-page loading indicator */}
        <div className="flex flex-col items-center gap-3 pt-4" style={{ color: "#6B7280" }}>
          <div
            className="h-7 w-7 animate-spin rounded-full border-4"
            style={{ borderColor: "#EEF2FF", borderTopColor: "#6366F1" }}
          />
          <span className="text-xs">Connecting to platform…</span>
        </div>
      </div>
    );
  }

  const updatedAt = stats?.updatedAt
    ? new Date(stats.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <>
      <div className="flex flex-col">
        {/* ── Sticky top bar ───────────────────────────────── */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-8 sm:py-4"
          style={{
            background:          "#FFFFFF",
            borderBottom:        "1px solid #E5E7EB",
            height: "64px",
          }}
        >
          <div>
            <h1 className="text-lg font-bold sm:text-xl rtl:text-right" style={{ color: "#111827" }}>{t("title")}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Live indicator */}
            <span className="flex items-center gap-1.5 text-xs font-medium sm:gap-2" style={{ color: "#10B981" }}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="hidden sm:inline">Live</span>
            </span>

            {/* Last updated */}
            <span className="hidden text-xs lg:block" style={{ color: "#6B7280" }}>
              {t("lastUpdated")}: <span style={{ color: "#6B7280" }}>{updatedAt}</span>
            </span>

            {/* WS status */}
            <WsBadge status={wsStatus} />

            {/* Refresh */}
            <button
              onClick={() => fetchData()}
              className="touch-target flex items-center justify-center rounded-lg transition-colors hover:bg-[#F3F4F8]"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" style={{ color: "#6B7280" }} />
            </button>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────── */}
        <div className="px-4 py-5 sm:px-8 sm:py-7">
          {/* Error banner */}
          {apiError && (
            <div
              className="mb-6 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: "#FEF2F2",
                border:     "1px solid #EF4444",
                color:      "#EF4444",
              }}
            >
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              {apiError}
            </div>
          )}

          {/* ── Stat cards (stack on mobile, 3-col on xl) ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            <StatsCard label={t("requests")}   value={stats?.requests          ?? 0} icon={Shield} glow="blue"   />
            <StatsCard label={t("tokens")}     value={stats?.tokensUsed        ?? 0} icon={Cpu}    glow="purple" />
            <StatsCard label={t("connections")}value={stats?.activeConnections ?? 0} icon={Users}  glow="green"  />
          </div>

          {/* ── Activity feed + Messages ──────────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ActivityFeed entries={feed} />

            {/* Messages table */}
            <div
              className="rounded-xl p-4 sm:p-5"
              style={{
                background: "#FFFFFF",
                border:     "1px solid #E5E7EB",
                boxShadow:  "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <h3 className="mb-4 text-sm font-bold" style={{ color: "#111827" }}>Pending Messages</h3>
              <div className="mb-4" style={{ height: "1px", background: "#E5E7EB" }} />

              <div className="flex flex-col gap-3" style={{ maxHeight: 300, overflowY: "auto" }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg px-3 py-3 sm:px-4 transition-colors hover:bg-[#F3F4F8]"
                    style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold truncate" style={{ color: "#374151" }}>{msg.sender}</span>
                      <span
                        className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: "#FFFBEB", color: "#F59E0B" }}
                      >
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: "#6B7280" }}>{msg.content}</p>
                    <p className="mt-1.5 text-xs italic" style={{ color: "#6366F1" }}>
                      ✦ {msg.aiSummary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WS disconnect toast ───────────────────────────── */}
      <WsToast show={showToast && wsStatus === "disconnected"} message={tErr("wsDisconnected")} />
    </>
  );
}
