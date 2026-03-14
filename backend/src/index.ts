import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';

import { initDb } from './db';
import { redis } from './redis';
import { initSocket } from './socket';

import statsRouter   from './routes/stats';
import messagesRouter from './routes/messages';
import paymentRouter  from './routes/payment';
import sessionRouter  from './routes/session';
import chatRouter     from './routes/chat';
import webhookRouter  from './routes/webhook';

const PORT = Number(process.env.PORT ?? 4000);

async function bootstrap(): Promise<void> {
  // ── 1. Database (non-fatal — server starts without local Postgres)
  try {
    await initDb();
  } catch (err) {
    console.warn('[db] Database unavailable — stats persistence disabled:', (err as Error).message);
  }

  // ── 2. Redis (ping to verify connection) ────────────────────
  try {
    await redis.ping();
    console.log('[redis] Ping OK');
  } catch (err) {
    console.warn('[redis] Initial ping failed (will retry in background):', (err as Error).message);
  }

  // ── 3. Express ──────────────────────────────────────────────
  const app = express();

  app.use(cors({ origin: '*' }));

  // ── Stripe webhook (raw body MUST come before express.json()) ─
  // Stripe signs the raw request body; once JSON-parsed the
  // signature check will fail. Mount this route first.
  app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // API routes
  app.use('/api/stats',                 statsRouter);
  app.use('/api/messages',              messagesRouter);
  app.use('/api/create-payment-intent', paymentRouter);
  app.use('/api/session',               sessionRouter);
  app.use('/api/chat',                  chatRouter);

  // ── 4. HTTP + Socket.io ─────────────────────────────────────
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[server] Listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] Fatal error during bootstrap:', err);
  process.exit(1);
});
