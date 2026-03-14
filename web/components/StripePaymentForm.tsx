"use client";

/**
 * StripePaymentForm
 *
 * Renders Stripe's hosted Payment Element inside a dark-themed shell
 * that matches the rest of the NovaMind AI UI.
 *
 * Usage:
 *   <StripePaymentForm
 *     clientSecret="pi_xxx_secret_xxx"
 *     onSuccess={(paymentIntentId) => ...}
 *     onError={(message) => ...}
 *   />
 *
 * Requires env var:
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
 */

import { FormEvent, useState } from "react";
import { loadStripe, type StripeElementsOptionsClientSecret } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { CreditCard, Loader2, Lock } from "lucide-react";

// ── Stripe singleton (initialised once, never re-created) ──────
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

// ── Stripe Element appearance (light theme) ─────────────────────
const STRIPE_APPEARANCE: StripeElementsOptionsClientSecret["appearance"] = {
  theme: "stripe",
  variables: {
    colorPrimary:        "#6366F1",
    colorBackground:     "#FFFFFF",
    colorText:           "#111827",
    colorTextSecondary:  "#6B7280",
    colorDanger:         "#EF4444",
    fontFamily:          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    borderRadius:        "10px",
    spacingUnit:         "4px",
  },
  rules: {
    ".Input": {
      border:          "1px solid #E5E7EB",
      backgroundColor: "#FFFFFF",
      color:           "#111827",
    },
    ".Input:focus": {
      border:    "1px solid #6366F1",
      boxShadow: "0 0 0 3px rgba(99,102,241,0.1)",
    },
    ".Label": { color: "#6B7280", fontWeight: "600", fontSize: "11px" },
    ".Tab": {
      border:          "1px solid #E5E7EB",
      backgroundColor: "#FFFFFF",
      color:           "#6B7280",
    },
    ".Tab--selected": {
      border:          "1px solid #6366F1",
      backgroundColor: "#EEF2FF",
      color:           "#6366F1",
    },
  },
};

// ── Inner form (must live inside <Elements>) ───────────────────
interface InnerFormProps {
  amountCents: number;
  onSuccess:   (paymentIntentId: string) => void;
  onError:     (message: string) => void;
}

function InnerPaymentForm({ amountCents, onSuccess, onError }: InnerFormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;

    setBusy(true);

    // confirmPayment talks directly to Stripe — no server round-trip
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // After 3D-Secure redirects Stripe returns here
        return_url: typeof window !== "undefined" ? window.location.href : "/",
      },
      // Don't redirect if no redirect is required (card payments)
      redirect: "if_required",
    });

    setBusy(false);

    if (error) {
      onError(error.message ?? "Payment failed. Please try again.");
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      // e.g. "requires_action" for 3DS — Stripe.js handles the redirect
      onError(`Unexpected payment status: ${paymentIntent?.status}`);
    }
  }

  const formattedAmount = `$${(amountCents / 100).toFixed(2)}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Stripe Payment Element */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "#F8F9FC",
          border:     "1px solid #E5E7EB",
        }}
      >
        <PaymentElement
          options={{
            layout: "tabs",
            // Pre-fill card details for testing
            defaultValues: { billingDetails: { name: "NovaMind User" } },
          }}
        />
      </div>

      {/* Confirm button */}
      <button
        type="submit"
        disabled={busy || !stripe || !elements}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #7C3AED 100%)",
          boxShadow:  "0 4px 20px rgba(99,102,241,0.4)",
        }}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay {formattedAmount}
          </>
        )}
      </button>

      {/* Stripe badge */}
      <div className="flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3" style={{ color: "#6B7280" }} />
        <span className="text-xs" style={{ color: "#6B7280" }}>
          Payments secured by{" "}
          <span style={{ color: "#6366F1", fontWeight: 600 }}>Stripe</span>
        </span>
      </div>
    </form>
  );
}

// ── Public component (wraps InnerPaymentForm in <Elements>) ────
export interface StripePaymentFormProps {
  clientSecret: string;
  amountCents:  number;
  onSuccess:    (paymentIntentId: string) => void;
  onError:      (message: string) => void;
}

export function StripePaymentForm({
  clientSecret,
  amountCents,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const options: StripeElementsOptionsClientSecret = {
    clientSecret,
    appearance: STRIPE_APPEARANCE,
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <InnerPaymentForm
        amountCents={amountCents}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
