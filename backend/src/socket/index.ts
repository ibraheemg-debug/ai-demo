import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { getStats, updateStats } from '../db';

let io: SocketServer;

/** In-memory counter of live Socket.io clients. */
let activeConnections = 0;

export function getActiveConnections(): number {
  return activeConnections;
}

// ── Helpers ───────────────────────────────────────────────────

/** Re-read stats from DB, persist new activeConnections, and broadcast. */
async function broadcastStats(): Promise<void> {
  try {
    const stats = await getStats();
    await updateStats(stats.requests, stats.tokensUsed, activeConnections);
    io.emit('stats:update', {
      requests:          stats.requests,
      tokensUsed:        stats.tokensUsed,
      activeConnections,
      updatedAt:         new Date().toISOString(),
    });
  } catch (err) {
    console.error('[socket] broadcastStats failed:', (err as Error).message);
  }
}

// ── Init ──────────────────────────────────────────────────────

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', async (socket: Socket) => {
    activeConnections++;
    console.log(`[socket] Connected  id=${socket.id}  total=${activeConnections}`);

    // Push updated stats immediately so clients see the new connection count
    await broadcastStats();

    // ── Session relay events ────────────────────────────────
    socket.on('session:start', ({ sessionId }: { sessionId: string }) => {
      console.log(`[socket] session:start  sessionId=${sessionId}`);
      // Broadcast to every OTHER client (dashboard etc.)
      socket.broadcast.emit('session:update', {
        action:    'start',
        sessionId,
        timestamp: Date.now(),
      });
    });

    socket.on('session:end', ({ sessionId, cost }: { sessionId: string; cost: number }) => {
      console.log(`[socket] session:end  sessionId=${sessionId}  cost=$${cost.toFixed(2)}`);
      socket.broadcast.emit('session:update', {
        action:    'end',
        sessionId,
        cost,
        timestamp: Date.now(),
      });
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      activeConnections = Math.max(0, activeConnections - 1);
      console.log(`[socket] Disconnected id=${socket.id}  total=${activeConnections}`);
      await broadcastStats();
    });
  });

  return io;
}

/** Broadcast an arbitrary event to all connected clients. */
export function emitToAll(event: string, data: unknown): void {
  if (!io) return;
  io.emit(event, data);
}
