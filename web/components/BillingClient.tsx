"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { io, Socket } from "socket.io-client";
import {
  Play,
  Square,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  CreditCard,
  RotateCcw,
  Hash,
  Zap,
} from "lucide-react";
import { StripePaymentForm } from "./StripePaymentForm";

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? "http://localhost:4000";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
const COST_PER_SEC = 0.02; // $0.02 / second

// ── Types ─────────────────────────────────────────────────────
type SessionState = "idle" | "active" | "ended";

/**
 * Payment state machine:
 *   idle              → session not yet ended
 *   loading           → fetching clientSecret from backend
 *   requires_payment  → Stripe Elements shown, waiting for user to submit card
 *   success           → payment confirmed by Stripe
 *   error             → any failure (network, card declined, etc.)
 */
type PaymentState = "idle" | "loading" | "requires_payment" | "success" | "error";

// ── Helpers ───────────────────────────────────────────────────
function padTwo(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${padTwo(h)}:${padTwo(m)}:${padTwo(s)}`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0)  return "0s";
  if (seconds < 60)  return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

// ── Timer digit block ─────────────────────────────────────────
function TimeBlock({ value }: { value: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg font-mono text-[48px] font-black tracking-tight sm:text-5xl"
      style={{
        width:      "3.5rem",
        height:     "5rem",
        background: "#F8F9FC",
        border:     "1px solid #E5E7EB",
        color:      "#111827",
      }}
    >
      {value}
    </div>
  );
}

function TimeSeparator() {
  return (
    <span className="mb-2 self-end pb-3 font-mono text-4xl font-black sm:text-5xl" style={{ color: "#6B7280" }}>
      :
    </span>
  );
}

function TimerDisplay({ seconds }: { seconds: number }) {
  const clock = formatClock(seconds);
  const [hh, mm, ss] = clock.split(":");
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <TimeBlock value={hh[0]} />
      <TimeBlock value={hh[1]} />
      <TimeSeparator />
      <TimeBlock value={mm[0]} />
      <TimeBlock value={mm[1]} />
      <TimeSeparator />
      <TimeBlock value={ss[0]} />
      <TimeBlock value={ss[1]} />
    </div>
  );
}

// ── Summary modal ─────────────────────────────────────────────
interface SummaryModalProps {
  elapsed:         number;
  amountCents:     number;
  paymentState:    PaymentState;
  clientSecret:    string | null;
  paymentIntentId: string | null;
  paymentError:    string | null;
  onPaymentSuccess:(paymentIntentId: string) => void;
  onPaymentError:  (message: string) => void;
  onNewSession:    () => void;
}

function SummaryModal({
  elapsed,
  amountCents,
  paymentState,
  clientSecret,
  paymentIntentId,
  paymentError,
  onPaymentSuccess,
  onPaymentError,
  onNewSession,
}: SummaryModalProps) {
  // Derive header icon / subtitle
  const headerIcon =
    paymentState === "loading" ? (
      <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
    ) : paymentState === "requires_payment" ? (
      <CreditCard className="h-5 w-5 text-indigo-400" />
    ) : paymentState === "success" ? (
      <CheckCircle className="h-5 w-5 text-emerald-400" />
    ) : paymentState === "error" ? (
      <XCircle className="h-5 w-5 text-red-400" />
    ) : null;

  const subtitle =
    paymentState === "loading"
      ? "Initialising payment…"
      : paymentState === "requires_payment"
      ? "Enter your card details below"
      : paymentState === "success"
      ? "Payment confirmed"
      : paymentState === "error"
      ? "Payment failed"
      : "Review your session";

  const cost = elapsed * COST_PER_SEC;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl"
        style={{
          background: "#FFFFFF",
          border:     "1px solid #E5E7EB",
          boxShadow:  "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 rounded-t-2xl px-6 py-5"
          style={{
            background:   "#FFFFFF",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          {headerIcon}
          <div>
            <h2 className="text-base font-bold" style={{ color: "#111827" }}>Session Complete</h2>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {subtitle}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Session summary row — always visible */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryBox
              icon={Clock}
              label="Duration"
              value={formatDuration(elapsed)}
              color="#818CF8"
            />
            <SummaryBox
              icon={DollarSign}
              label="Total Cost"
              value={`$${cost.toFixed(2)}`}
              color="#34D399"
            />
          </div>

          {/* ── Loading: fetching clientSecret ──────────────────── */}
          {paymentState === "loading" && (
            <div
              className="flex items-center justify-center gap-3 rounded-xl py-4"
              style={{
                background: "#EEF2FF",
                border:     "1px solid #6366F1",
              }}
            >
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#6366F1" }} />
              <span className="text-sm" style={{ color: "#6B7280" }}>
                Preparing payment…
              </span>
            </div>
          )}

          {/* ── Stripe Elements form ────────────────────────────── */}
          {paymentState === "requires_payment" && clientSecret && (
            <>
              {/* Payment Intent ID shown immediately on creation */}
              {paymentIntentId && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" style={{ color: "#6B7280" }} />
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Payment Intent ID
                    </span>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3 font-mono text-xs leading-relaxed break-all"
                    style={{
                      background: "#F8F9FC",
                      border:     "1px solid #E5E7EB",
                      color:      "#6366F1",
                    }}
                  >
                    {paymentIntentId}
                  </div>
                </div>
              )}

              <StripePaymentForm
                clientSecret={clientSecret}
                amountCents={amountCents}
                onSuccess={onPaymentSuccess}
                onError={onPaymentError}
              />
            </>
          )}

          {/* ── Success state ───────────────────────────────────── */}
          {paymentState === "success" && paymentIntentId && (
            <>
              <div
                className="flex items-center gap-2.5 rounded-lg px-4 py-3"
                style={{
                  background: "#ECFDF5",
                  borderLeft: "4px solid #10B981",
                }}
              >
                <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#10B981" }} />
                <span className="text-sm font-medium" style={{ color: "#065F46" }}>
                  Payment confirmed successfully
                </span>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" style={{ color: "#6B7280" }} />
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#6B7280" }}
                  >
                    Payment Intent ID
                  </span>
                </div>
                <div
                  className="rounded-lg px-4 py-3 font-mono text-xs leading-relaxed break-all"
                  style={{
                    background: "#F8F9FC",
                    border:     "1px solid #E5E7EB",
                    color:      "#6366F1",
                  }}
                >
                  {paymentIntentId}
                </div>
              </div>
            </>
          )}

          {/* ── Error state ─────────────────────────────────────── */}
          {paymentState === "error" && paymentError && (
            <div
              className="flex items-start gap-2.5 rounded-lg px-4 py-3"
              style={{
                background: "#FEF2F2",
                border:     "1px solid #EF4444",
              }}
            >
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
              <span className="text-sm" style={{ color: "#EF4444" }}>{paymentError}</span>
            </div>
          )}

          {/* New session button — shown after terminal states */}
          {(paymentState === "success" || paymentState === "error") && (
            <button
              onClick={onNewSession}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                boxShadow:  "0 4px 12px rgba(99,102,241,0.3)",
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Start New Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon:  React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg px-4 py-4"
      style={{
        background: "#F8F9FC",
        border:     "1px solid #E5E7EB",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" style={{ color: "#6B7280" }} />
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: "#6B7280" }}
        >
          {label}
        </span>
      </div>
      <p className="text-2xl font-black tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ── Main billing client ───────────────────────────────────────
export function BillingClient() {
  const t    = useTranslations("billing");
  const tErr = useTranslations("errors");

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [sessionId,    setSessionId]    = useState("");
  const [elapsed,      setElapsed]      = useState(0);
  const [startedAt,    setStartedAt]    = useState<number | null>(null);

  // Payment / summary state
  const [showSummary,      setShowSummary]      = useState(false);
  const [finalElapsed,     setFinalElapsed]     = useState(0);
  const [finalAmountCents, setFinalAmountCents] = useState(0);
  const [paymentState,     setPaymentState]     = useState<PaymentState>("idle");
  const [clientSecret,     setClientSecret]     = useState<string | null>(null);
  const [paymentIntentId,  setPaymentIntentId]  = useState<string | null>(null);
  const [paymentError,     setPaymentError]     = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Live cost estimate
  const cost = elapsed * COST_PER_SEC;

  // ── Socket ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  // ── Timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (sessionState !== "active" || !startedAt) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionState, startedAt]);

  // ── Start session ────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    const id  = crypto.randomUUID();
    const now = Date.now();

    setSessionId(id);
    setStartedAt(now);
    setElapsed(0);
    setSessionState("active");
    setPaymentState("idle");
    setClientSecret(null);
    setPaymentIntentId(null);
    setPaymentError(null);

    socketRef.current?.emit("session:start", { sessionId: id });

    try {
      await fetch(`${API_URL}/api/session`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "start", sessionId: id }),
      });
    } catch (err) {
      console.warn("[billing] Failed to record session start:", err);
    }
  }, []);

  // ── End session ──────────────────────────────────────────────
  const handleEnd = useCallback(async () => {
    if (sessionState !== "active" || !sessionId || !startedAt) return;

    const final         = Math.floor((Date.now() - startedAt) / 1000);
    const finalCost     = final * COST_PER_SEC;
    // Stripe minimum charge is $0.50
    const amountCents   = Math.max(50, Math.ceil(finalCost * 100));

    setSessionState("ended");
    setFinalElapsed(final);
    setFinalAmountCents(amountCents);
    setShowSummary(true);
    setPaymentState("loading"); // step 1: fetch clientSecret

    socketRef.current?.emit("session:end", { sessionId, cost: finalCost });

    // Fire-and-forget: persist session end in backend
    fetch(`${API_URL}/api/session`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "end", sessionId }),
    }).catch((err) => console.warn("[billing] Failed to record session end:", err));

    // Create PaymentIntent and get clientSecret
    try {
      const res  = await fetch(`${API_URL}/api/create-payment-intent`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          amount:    amountCents,
          sessionId,
          email:     "demo@example.com",
        }),
      });
      const data = await res.json() as {
        clientSecret?:    string;
        paymentIntentId?: string;
        error?:           string;
      };

      if (res.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId ?? null);
        setPaymentState("requires_payment"); // step 2: show Stripe Elements
      } else {
        setPaymentError(data.error ?? tErr("paymentFailed"));
        setPaymentState("error");
      }
    } catch {
      setPaymentError(tErr("paymentFailed") + " — could not reach payment server");
      setPaymentState("error");
    }
  }, [sessionState, sessionId, startedAt, tErr]);

  // ── Stripe confirmed payment ──────────────────────────────────
  const handlePaymentSuccess = useCallback((confirmedId: string) => {
    setPaymentIntentId(confirmedId);
    setPaymentState("success");
  }, []);

  const handlePaymentError = useCallback((message: string) => {
    setPaymentError(message);
    setPaymentState("error");
  }, []);

  // ── Reset for new session ────────────────────────────────────
  function handleNewSession() {
    setShowSummary(false);
    setSessionState("idle");
    setElapsed(0);
    setStartedAt(null);
    setSessionId("");
    setFinalElapsed(0);
    setFinalAmountCents(0);
    setClientSecret(null);
    setPaymentIntentId(null);
    setPaymentError(null);
    setPaymentState("idle");
  }

  const isActive = sessionState === "active";

  return (
    <>
      {/* ── Sticky top bar ───────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 flex items-center px-8 py-4"
        style={{
          background:           "#FFFFFF",
          borderBottom:         "1px solid #E5E7EB",
          height: "64px",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: "#EEF2FF" }}
          >
            <CreditCard className="h-4 w-4" style={{ color: "#6366F1" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#111827" }}>{t("title")}</h1>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Main session card */}
          <div
            className="relative rounded-2xl"
            style={{
              background: "#FFFFFF",
              border:     "1px solid #E5E7EB",
              boxShadow:  "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
              transition: "all 0.2s ease",
            }}
          >
            <div className="px-6 pb-6 pt-6">
              {/* Card heading + status */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#111827" }}>Current Session</h2>
                </div>

                {isActive && (
                  <div
                    className="flex items-center gap-2 rounded-full px-3 py-1.5"
                    style={{
                      background: "#FEF2F2",
                      border:     "1px solid #EF4444",
                    }}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "#EF4444" }}>
                      {t("running")}
                    </span>
                  </div>
                )}
              </div>

              {/* Digital clock */}
              <div className="mb-6 mx-4 flex flex-col items-center">
                <TimerDisplay seconds={elapsed} />
              </div>

              {/* Cost display */}
              <div className="mb-8 flex flex-col items-center">
                <p
                  className="text-[32px] font-bold tabular-nums tracking-tight"
                  style={{
                    color:      "#6366F1",
                    transition: "color 0.3s",
                  }}
                >
                  ${cost.toFixed(2)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Zap className="h-3 w-3" style={{ color: "#6B7280" }} />
                  <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
                    @ ${COST_PER_SEC.toFixed(2)} / second
                  </p>
                </div>
              </div>

              {/* Action button */}
              {!isActive ? (
                <button
                  onClick={handleStart}
                  className="flex w-full items-center justify-center gap-3 rounded-xl py-4 text-base font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                    boxShadow:  "0 4px 12px rgba(99,102,241,0.3)",
                    transition: "all 0.2s ease",
                    height: "52px",
                    letterSpacing: "0.02em",
                  }}
                >
                  <Play className="h-5 w-5" />
                  {t("startSession")}
                </button>
              ) : (
                <button
                  onClick={handleEnd}
                  className="flex w-full items-center justify-center gap-3 rounded-xl py-4 text-base font-semibold text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                  style={{
                    background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
                    boxShadow:  "0 4px 12px rgba(239,68,68,0.3)",
                    transition: "all 0.2s ease",
                    height: "52px",
                    letterSpacing: "0.02em",
                  }}
                >
                  <Square className="h-5 w-5" />
                  {t("endSession")}
                </button>
              )}
            </div>
          </div>

          {/* Info card */}
          <div
            className="mt-4 rounded-lg px-5 py-4"
            style={{
              background: "#F8F9FC",
              border:     "1px solid #E5E7EB",
            }}
          >
            <div
              className="grid grid-cols-2 gap-4 text-xs"
              style={{ color: "#6B7280" }}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" style={{ color: "#6366F1" }} />
                <span>
                  <strong style={{ color: "#374151" }}>{t("cost")}:</strong> $0.02/sec
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-3.5 w-3.5" style={{ color: "#6366F1" }} />
                <span>
                  <strong style={{ color: "#374151" }}>{t("paymentId")}:</strong> after session
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary / payment modal ───────────────────────────── */}
      {showSummary && (
        <SummaryModal
          elapsed={finalElapsed}
          amountCents={finalAmountCents}
          paymentState={paymentState}
          clientSecret={clientSecret}
          paymentIntentId={paymentIntentId}
          paymentError={paymentError}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onNewSession={handleNewSession}
        />
      )}
    </>
  );
}
