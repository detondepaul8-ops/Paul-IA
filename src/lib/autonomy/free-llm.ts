// ── MOTEUR INTERNE PAUL IA — Cerveau LLM libre ────────────────────────────
// Fonctionne SANS Z AI, SANS GROQ, SANS clé API, SANS crédit :
// serveurs de calcul open source (Pollinations — modèles ouverts).
// Rôle d'après l'architecture imposée : moteur principal de repli ;
// Z AI / GROQ ne sont que des renforts quand ils apportent une valeur ajoutée.

export interface FreeLLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const FREE_LLM_ENDPOINT = 'https://text.pollinations.ai/openai';
const FREE_LLM_GET = 'https://text.pollinations.ai';
const DEFAULT_MODEL = 'openai';

export class FreeLLMError extends Error {}

function flattenMessages(messages: FreeLLMMessage[]): { system: string; prompt: string } {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const prompt = messages.filter((m) => m.role !== 'system').map((m) => m.content).join('\n\n');
  return { system, prompt };
}

/**
 * Chat completions via le moteur interne libre (modèles ouverts, sans clé).
 * Multi-canal : POST OpenAI-compatible (openai, puis mistral), puis canal GET
 * simple — pour survivre aux rafales 503 d'un service gratuit.
 */
export async function freeLLMChat(
  messages: FreeLLMMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string; timeoutMs?: number }
): Promise<string> {
  const model = options?.model || process.env.PAUL_FREE_LLM_MODEL || DEFAULT_MODEL;
  const timeoutMs = options?.timeoutMs || 45000;
  const { system, prompt } = flattenMessages(messages);
  const lastErrors: string[] = [];

  type Channel = { kind: 'post'; model: string } | { kind: 'get' };
  const channels: Channel[] = [
    { kind: 'post', model },
    { kind: 'post', model: 'mistral' },
    { kind: 'get' },
  ];

  for (const channel of channels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let res: Response;
        if (channel.kind === 'post') {
          res = await fetch(FREE_LLM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: channel.model,
              messages,
              temperature: options?.temperature ?? 0.7,
              max_tokens: options?.maxTokens ?? 2048,
              referrer: 'paul-ia',
            }),
            signal: AbortSignal.timeout(timeoutMs),
          });
        } else {
          const url = `${FREE_LLM_GET}/${encodeURIComponent(prompt.slice(0, 4000))}` +
            `?system=${encodeURIComponent(system.slice(0, 1500))}&model=openai&referrer=paul-ia` +
            (options?.maxTokens ? `&max_tokens=${options.maxTokens}` : '');
          res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        }
        if (!res.ok) throw new FreeLLMError(`canal ${channel.kind}/${channel.kind === 'post' ? channel.model : 'get'} HTTP ${res.status}`);
        const text = channel.kind === 'post' ? (await res.json())?.choices?.[0]?.message?.content : await res.text();
        if (typeof text !== 'string' || !text.trim()) throw new FreeLLMError('réponse vide du moteur interne');
        // Garde-fous contre les réponses parasites (page HTML renvoyée par un
        // canal dégradé, réponse hors proportion) : rejet et canal suivant.
        if (channel.kind === 'get' && (/<html[\s>]|<!doctype html/i.test(text) || text.length > 60_000)) {
          throw new FreeLLMError('réponse parasite du canal GET (HTML ou hors proportion)');
        }
        return text.trim();
      } catch (error) {
        lastErrors.push(error instanceof Error ? error.message : String(error));
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw new FreeLLMError(`moteur interne LLM indisponible (3 canaux, 2 essais chacun): ${lastErrors.slice(-2).join(' | ')}`);
}

/** Extrait le premier objet/tableau JSON d'un texte (tolérant aux fences). */
export function extractJson<T = any>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = Math.min(
    ...['{', '['].map((c) => {
      const i = cleaned.indexOf(c);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    })
  );
  if (start === Number.MAX_SAFE_INTEGER) return null;
  const opener = cleaned[start];
  const closer = opener === '{' ? '}' : ']';
  const end = cleaned.lastIndexOf(closer);
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// ── Renfort Groq (OpenAI-compatible) — utilisé seulement si sa clé existe ──
export async function groqChat(
  messages: FreeLLMMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new FreeLLMError('GROQ_API_KEY absente (renfort indisponible)');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new FreeLLMError(`Groq HTTP ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new FreeLLMError('réponse Groq vide');
  return content.trim();
}
