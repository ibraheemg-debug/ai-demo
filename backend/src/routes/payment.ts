import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { redis } from '../redis';

const router = Router();

// ── Stripe client (lazy — guards against missing key at startup) ─
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_your_key_here') {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key);
}

// ── Email helpers ─────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds <= 0)  return '0s';
  if (seconds < 60)  return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function buildEmailHtml(opts: {
  email:           string;
  sessionId:       string;
  durationSec:     number;
  amountCents:     number;
  paymentIntentId: string;
}): string {
  const { sessionId, durationSec, amountCents, paymentIntentId } = opts;
  const formattedDuration = formatDuration(durationSec);
  const formattedAmount   = `$${(amountCents / 100).toFixed(2)}`;
  const year              = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Payment Confirmed — NovaMind AI</title>
  <style>
    *  { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #07070D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px 16px; }
    .wrap { max-width: 580px; margin: 0 auto; }
    .card { background: #13131A; border-radius: 20px; border: 1px solid rgba(255,255,255,0.07); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #1e1043 50%, #0d1117 100%); padding: 36px 36px 32px; border-bottom: 1px solid rgba(99,102,241,0.2); }
    .logo  { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #fff; }
    .logo span { background: linear-gradient(135deg, #6366F1, #A855F7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.25); color: #34D399; border-radius: 8px; padding: 5px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }
    .body  { padding: 32px 36px; }
    h2    { font-size: 18px; font-weight: 700; color: #E2E8F0; margin-bottom: 6px; }
    .sub  { font-size: 14px; color: #64748B; margin-bottom: 24px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px; }
    .box  { background: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 18px; }
    .box-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.9px; color: #475569; margin-bottom: 6px; }
    .box-value { font-size: 26px; font-weight: 800; color: #E2E8F0; letter-spacing: -0.5px; }
    .pid-label { font-size: 12px; color: #64748B; margin-bottom: 8px; font-weight: 600; }
    .pid  { background: rgba(0,0,0,0.35); border: 1px solid rgba(99,102,241,0.2); border-radius: 10px; padding: 14px 16px; font-family: 'Courier New', monospace; font-size: 12px; color: #818CF8; word-break: break-all; line-height: 1.6; margin-bottom: 24px; }
    .info { background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.12); border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #94A3B8; line-height: 1.55; }
    .footer { padding: 20px 36px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; font-size: 11px; color: #334155; line-height: 1.7; }
    .footer a { color: #6366F1; text-decoration: none; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="logo">⚡ <span>NovaMind AI</span></div>
      <div class="badge">✓ &nbsp;Payment Confirmed</div>
    </div>
    <div class="body">
      <h2>Your session has been charged</h2>
      <p class="sub">
        Thank you for using NovaMind AI. Below is a summary of your session
        and the Stripe payment details.
      </p>

      <div class="grid">
        <div class="box">
          <div class="box-label">Session Duration</div>
          <div class="box-value">${formattedDuration}</div>
        </div>
        <div class="box">
          <div class="box-label">Amount Charged</div>
          <div class="box-value">${formattedAmount}</div>
        </div>
      </div>

      <p class="pid-label">Payment Intent ID</p>
      <div class="pid">${paymentIntentId}</div>

      <div class="info">
        This payment was processed in <strong style="color:#818CF8">Stripe test mode</strong>.
        No real money was charged. Session ID: <code style="font-size:11px;color:#6366F1">${sessionId}</code>
      </div>
    </div>
    <div class="footer">
      © ${year} NovaMind AI Platform &nbsp;·&nbsp; AI-powered productivity tools<br />
      This is an automated receipt — please do not reply to this email.
    </div>
  </div>
</div>
</body>
</html>`;
}

// ── Route ─────────────────────────────────────────────────────

interface PaymentBody {
  amount:    number; // cents
  sessionId: string;
  email:     string;
}

router.post(
  '/',
  async (req: Request<object, object, PaymentBody>, res: Response): Promise<void> => {
    const { amount, sessionId, email } = req.body ?? {};

    if (!amount || !sessionId || !email) {
      res.status(400).json({ error: 'body must contain amount (cents), sessionId, and email' });
      return;
    }
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number (cents)' });
      return;
    }

    // ── 1. Create Stripe PaymentIntent ────────────────────
    let paymentIntent: Stripe.PaymentIntent;
    try {
      const stripe = getStripe();
      paymentIntent = await stripe.paymentIntents.create({
        amount:   Math.ceil(amount),
        currency: 'usd',
        metadata: { sessionId, email, platform: 'novamind-ai' },
        // Automatic payment methods disabled for server-only flow (demo)
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      });
    } catch (err) {
      const msg = (err as Error).message;
      console.error('[/api/create-payment-intent] Stripe error:', msg);
      res.status(502).json({ error: `Stripe error: ${msg}` });
      return;
    }

    // ── 2. Send confirmation email (non-blocking) ─────────
    try {
      // Retrieve session duration from Redis for the email
      let durationSec = 0;
      try {
        const durStr = await redis.get(`session:${sessionId}:duration`);
        if (durStr) {
          durationSec = parseInt(durStr, 10);
        } else {
          // Fall back: estimate from start time
          const startStr = await redis.get(`session:${sessionId}:start`);
          if (startStr) durationSec = Math.floor((Date.now() - Number(startStr)) / 1000);
        }
      } catch { /* Redis unavailable — use 0 */ }

      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST  ?? 'smtp.gmail.com',
        port:   Number(process.env.SMTP_PORT ?? 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: false },
      });

      await transporter.sendMail({
        from:    `"NovaMind AI" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
        to:      email,
        subject: 'Payment Confirmed — NovaMind AI Session',
        html:    buildEmailHtml({
          email,
          sessionId,
          durationSec,
          amountCents:     Math.ceil(amount),
          paymentIntentId: paymentIntent.id,
        }),
      });

      console.log(`[/api/create-payment-intent] Confirmation email sent to ${email}`);
    } catch (emailErr) {
      // Email failure MUST NOT break the payment response
      console.error('[/api/create-payment-intent] Email send failed:', (emailErr as Error).message);
    }

    // ── 3. Respond ────────────────────────────────────────
    res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret:    paymentIntent.client_secret, // needed by Stripe.js to confirm on the client
      amount:          paymentIntent.amount,
      status:          paymentIntent.status,
    });
  }
);

export default router;
