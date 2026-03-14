import { Router, Request, Response } from 'express';
import { redis }     from '../redis';
import { grok, GROK_MODEL } from '../grok';

const router = Router();

// ── Mock message bodies ───────────────────────────────────────
const MOCK_MESSAGES = [
  {
    id:     'msg_001',
    sender: 'Alice Chen',
    content:'Can you summarise the Q3 financial report for me?',
    status: 'pending' as const,
  },
  {
    id:     'msg_002',
    sender: 'Bob Martinez',
    content:'What are the latest updates on the AI platform deployment?',
    status: 'pending' as const,
  },
  {
    id:     'msg_003',
    sender: 'Carol Williams',
    content:'Schedule a meeting with the engineering team next Monday.',
    status: 'pending' as const,
  },
  {
    id:     'msg_004',
    sender: 'David Park',
    content:'Generate a weekly performance report for our top 5 clients.',
    status: 'pending' as const,
  },
  {
    id:     'msg_005',
    sender: 'Eva Johnson',
    content:'Translate the onboarding document into Arabic and French.',
    status: 'pending' as const,
  },
];

// Hard-coded fallback summaries (used when Grok is unavailable)
const FALLBACK_SUMMARIES: Record<string, string> = {
  msg_001: 'Request to summarise Q3 financial data. Key metrics: revenue +12%, costs stable.',
  msg_002: 'Deployment status inquiry. Platform is running v2.4.1 with 99.8% uptime.',
  msg_003: 'Meeting scheduling request. Target: engineering team, date: next Monday.',
  msg_004: 'Report generation task. Scope: top 5 clients, period: last 7 days.',
  msg_005: 'Translation request for onboarding document into Arabic (AR) and French (FR).',
};

const SUMMARY_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Generate a one-sentence summary using Grok.
 * Falls back to a hard-coded string if the API call fails.
 * Results are cached in Redis for 1 hour.
 */
async function getSummary(msgId: string, content: string): Promise<string> {
  const cacheKey = `summary:${msgId}`;

  // 1. Return cached value if available
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[messages] Cache hit for ${cacheKey}`);
      return cached;
    }
  } catch (err) {
    console.warn('[messages] Redis read failed:', (err as Error).message);
  }

  // 2. Call Grok API
  try {
    const completion = await grok.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role:    'system',
          content: 'You are an AI assistant. Summarize the given message in one concise sentence under 20 words.',
        },
        { role: 'user', content },
      ],
      max_tokens: 60,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? FALLBACK_SUMMARIES[msgId];
    console.log(`[messages] Grok summary for ${msgId}: "${summary}"`);

    // 3. Cache the result
    try {
      await redis.setex(cacheKey, SUMMARY_TTL_SECONDS, summary);
    } catch (err) {
      console.warn('[messages] Redis write failed:', (err as Error).message);
    }

    return summary;
  } catch (err) {
    const errMsg = (err as Error).message ?? 'unknown';
    console.warn(`[messages] Grok API failed for ${msgId} (${errMsg}), using fallback`);
    return FALLBACK_SUMMARIES[msgId] ?? 'AI summary unavailable.';
  }
}

/**
 * GET /api/messages
 * Returns 5 messages each enriched with a Grok-generated (or cached) AI summary.
 * All 5 summaries are fetched in parallel. Individual failures fall back gracefully.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const messages = await Promise.all(
      MOCK_MESSAGES.map(async (msg) => ({
        ...msg,
        aiSummary: await getSummary(msg.id, msg.content),
      }))
    );
    res.json(messages);
  } catch (err) {
    console.error('[messages] Unexpected error:', err);
    // Last-resort fallback — return messages with hard-coded summaries
    res.json(
      MOCK_MESSAGES.map((msg) => ({
        ...msg,
        aiSummary: FALLBACK_SUMMARIES[msg.id] ?? 'AI summary unavailable.',
      }))
    );
  }
});

export default router;
