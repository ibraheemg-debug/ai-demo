import { Router, Request, Response } from 'express';
import { grok, GROK_MODEL } from '../grok';

const router = Router();

interface ChatMessage {
  role:    'user' | 'assistant' | 'system';
  content: string;
}

interface ChatBody {
  message: string;
  history: ChatMessage[];
}

const SYSTEM_PROMPT: ChatMessage = {
  role:    'system',
  content: [
    'You are NovaMind AI assistant.',
    'You help users understand their AI platform usage, billing, and analytics.',
    'Be concise, professional, and friendly.',
    'When discussing costs, assume the rate is $0.02 per second of session time.',
    'Keep responses under 3 sentences unless the user asks for more detail.',
  ].join(' '),
};

/**
 * POST /api/chat
 * Body: { message: string, history: [{role, content}] }
 * Returns: { reply: string } | { error: string }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { message, history } = req.body as ChatBody;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  // Build conversation array: system → history → new user message
  const safeHistory: ChatMessage[] = Array.isArray(history)
    ? history.slice(-18) // cap at last 18 turns (~9 exchanges) to stay within token limits
    : [];

  const messages: ChatMessage[] = [
    SYSTEM_PROMPT,
    ...safeHistory,
    { role: 'user', content: message },
  ];

  try {
    const completion = await grok.chat.completions.create({
      model:       GROK_MODEL,
      messages,
      max_tokens:  512,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? 'No response from AI.';
    console.log(`[chat] Grok reply (${reply.length} chars) for: "${message.substring(0, 50)}..."`);
    res.json({ reply });
  } catch (err) {
    const errMsg = (err as Error).message ?? 'unknown';
    console.error(`[chat] Grok API error: ${errMsg}`);
    res.json({ error: 'AI unavailable' });
  }
});

export default router;
