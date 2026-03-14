import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Initialise the database schema.
 * Creates `platform_stats` table if it doesn't exist and seeds one row.
 * Retries up to `maxRetries` times to handle Docker start-order races.
 */
export async function initDb(maxRetries = 5, delayMs = 1500): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS platform_stats (
          id                 SERIAL PRIMARY KEY,
          requests           INTEGER   NOT NULL DEFAULT 0,
          tokens_used        INTEGER   NOT NULL DEFAULT 0,
          active_connections INTEGER   NOT NULL DEFAULT 0,
          updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Ensure at least one row exists
      const { rowCount } = await pool.query('SELECT id FROM platform_stats LIMIT 1');
      if (!rowCount || rowCount === 0) {
        await pool.query(
          'INSERT INTO platform_stats (requests, tokens_used, active_connections) VALUES (0, 0, 0)'
        );
      }

      console.log('[db] Schema ready');
      return;
    } catch (err) {
      console.warn(`[db] Connection attempt ${attempt}/${maxRetries} failed:`, (err as Error).message);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

/** Fetch the single stats row. */
export async function getStats(): Promise<{
  id: number;
  requests: number;
  tokensUsed: number;
  activeConnections: number;
  updatedAt: Date;
}> {
  const { rows } = await pool.query<{
    id: number;
    requests: number;
    tokens_used: number;
    active_connections: number;
    updated_at: Date;
  }>('SELECT * FROM platform_stats ORDER BY id LIMIT 1');

  const row = rows[0];
  return {
    id: row.id,
    requests: row.requests,
    tokensUsed: row.tokens_used,
    activeConnections: row.active_connections,
    updatedAt: row.updated_at,
  };
}

/** Persist updated stats back to the database. */
export async function updateStats(
  requests: number,
  tokensUsed: number,
  activeConnections: number
): Promise<void> {
  await pool.query(
    `UPDATE platform_stats
     SET requests = $1, tokens_used = $2, active_connections = $3, updated_at = NOW()
     WHERE id = (SELECT id FROM platform_stats ORDER BY id LIMIT 1)`,
    [requests, tokensUsed, activeConnections]
  );
}
