import { Router, Request, Response } from 'express';
import { redis } from '../redis';
import { emitToAll } from '../socket';

const router = Router();

interface SessionBody {
  action:    'start' | 'end';
  sessionId: string;
}

// ── Keys ─────────────────────────────────────────────────────
const startKey = (id: string) => `session:${id}:start`;
const durKey   = (id: string) => `session:${id}:duration`;

// ── POST /api/session ────────────────────────────────────────
router.post(
  '/',
  async (req: Request<object, object, SessionBody>, res: Response): Promise<void> => {
    const { action, sessionId } = req.body ?? {};

    if (!action || !sessionId) {
      res.status(400).json({ error: 'body must contain "action" and "sessionId"' });
      return;
    }
    if (action !== 'start' && action !== 'end') {
      res.status(400).json({ error: 'action must be "start" or "end"' });
      return;
    }

    try {
      if (action === 'start') {
        // Store session start timestamp (24-hour TTL)
        await redis.set(startKey(sessionId), String(Date.now()), 'EX', 86_400);

        const payload = { sessionId, action: 'start', timestamp: Date.now() };
        emitToAll('session:update', payload);

        res.json({ ok: true, sessionId, action: 'start' });

      } else {
        // action === 'end'
        const startTs = await redis.get(startKey(sessionId));
        const durationSec = startTs
          ? Math.floor((Date.now() - Number(startTs)) / 1000)
          : 0;

        // Persist duration for the payment route to use in the email
        await redis.set(durKey(sessionId), String(durationSec), 'EX', 86_400);

        const payload = {
          sessionId,
          action:      'end',
          timestamp:   Date.now(),
          durationSec,
        };
        emitToAll('session:update', payload);

        res.json({ ok: true, sessionId, action: 'end', durationSec });
      }
    } catch (err) {
      console.error('[/api/session]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
