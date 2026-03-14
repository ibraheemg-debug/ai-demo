import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { redis } from '../redis';

const router = Router();

// ── Stripe client ─────────────────────────────────────────────
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

// ── POST /api/webhook ─────────────────────────────────────────
//
//  Stripe signs every event with STRIPE_WEBHOOK_SECRET so we can
//  verify it hasn't been tampered with.  The route is mounted with
//  express.raw() (in index.ts) so the raw body is still intact here.
//
router.post('/', (req: Request, res: Response): void => {
  const sig           = req.headers['stripe-signature'] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // ── Signature verification ───────────────────────────────────
  if (!webhookSecret) {
    console.warn('[webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature check (dev only)');
    res.json({ received: true });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig ?? '',
      webhookSecret,
    );
  } catch (err) {
    console.error('[webhook] Signature verification failed:', (err as Error).message);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  // ── Event routing ────────────────────────────────────────────
  handleEvent(event).catch((err) => {
    console.error('[webhook] Unhandled error processing event:', err);
  });

  // Always respond 200 quickly so Stripe doesn't retry
  res.json({ received: true });
});

// ── Async handler (keeps the request handler synchronous) ─────
async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {

    // ── Pay-as-you-go: single PaymentIntent per session ─────────
    case 'payment_intent.succeeded': {
      const pi        = event.data.object as Stripe.PaymentIntent;
      const sessionId = pi.metadata?.sessionId ?? 'unknown';
      const amountUsd = (pi.amount / 100).toFixed(2);

      console.log(
        `[webhook] ✅ PaymentIntent succeeded — id=${pi.id} ` +
        `amount=$${amountUsd} sessionId=${sessionId}`,
      );

      // Mark session as paid in Redis (TTL 7 days for audit)
      try {
        await redis.set(`session:${sessionId}:paid`, pi.id, 'EX', 604_800);
      } catch { /* Redis unavailable — non-fatal */ }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.warn(
        `[webhook] ❌ PaymentIntent failed — id=${pi.id} ` +
        `reason=${pi.last_payment_error?.message ?? 'unknown'}`,
      );
      break;
    }

    // ── Usage-based (metered) subscription events ────────────────
    //
    //  When you use Stripe Billing with a metered Price
    //  (aggregate_usage: "sum"), Stripe fires these at the end of
    //  each billing period after totalling up usage records.
    //
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(
        `[webhook] 📄 Invoice paid — id=${invoice.id} ` +
        `amount=$${((invoice.amount_paid ?? 0) / 100).toFixed(2)} ` +
        `customer=${invoice.customer}`,
      );
      // TODO: update subscription status in your DB
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(
        `[webhook] ❌ Invoice payment failed — id=${invoice.id} ` +
        `customer=${invoice.customer}`,
      );
      // TODO: notify user, pause their access, etc.
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`[webhook] 🔄 Subscription updated — id=${sub.id} status=${sub.status}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      console.log(`[webhook] 🗑️  Subscription cancelled — id=${sub.id}`);
      break;
    }

    default:
      // All other events are safe to ignore
      break;
  }
}

export default router;
