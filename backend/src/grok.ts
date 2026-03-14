/**
 * Grok (xAI) client — uses the OpenAI-compatible API.
 *
 * Base URL: https://api.x.ai/v1
 * Model:    process.env.GROK_MODEL (default: "grok-3-mini")
 *
 * Import `grok` wherever you need LLM completions.
 */
import OpenAI from 'openai';

if (!process.env.XAI_API_KEY) {
  console.warn('[grok] XAI_API_KEY is not set — AI features will use fallback responses.');
}

export const grok = new OpenAI({
  apiKey:  process.env.XAI_API_KEY ?? 'not-set',
  baseURL: 'https://api.x.ai/v1',
});

export const GROK_MODEL = process.env.GROK_MODEL ?? 'grok-3-mini';
