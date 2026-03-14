import { Router, Request, Response } from 'express';
import { getStats, updateStats } from '../db';
import { getActiveConnections, emitToAll } from '../socket';

const router = Router();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// In-memory fallback counters when Postgres is unavailable
let inMemRequests   = 0;
let inMemTokensUsed = 0;

/**
 * GET /api/stats
 * Returns current platform stats, increments request + token counters,
 * persists to PostgreSQL (with in-memory fallback when DB is unavailable),
 * and broadcasts via Socket.io.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    let current: { requests: number; tokensUsed: number; activeConnections: number };

    try {
      current = await getStats();
    } catch {
      // DB unavailable — use in-memory counters
      current = { requests: inMemRequests, tokensUsed: inMemTokensUsed, activeConnections: 0 };
    }

    const newRequests   = current.requests   + randomInt(1, 5);
    const newTokensUsed = current.tokensUsed + randomInt(50, 200);
    const activeConns   = getActiveConnections();

    // Persist to DB (silently skip on failure)
    try {
      await updateStats(newRequests, newTokensUsed, activeConns);
    } catch {
      inMemRequests   = newRequests;
      inMemTokensUsed = newTokensUsed;
    }

    const payload = {
      requests:          newRequests,
      tokensUsed:        newTokensUsed,
      activeConnections: activeConns,
      updatedAt:         new Date().toISOString(),
    };

    emitToAll('stats:update', payload);
    res.json(payload);
  } catch (err) {
    console.error('[/api/stats]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
