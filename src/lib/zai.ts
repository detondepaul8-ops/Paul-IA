import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: ZAI | null = null;

export async function getZAI(): Promise<ZAI> {
  if (!zaiInstance) {
    const configJson = process.env.ZAI_CONFIG_JSON;
    if (configJson) {
      // Serverless hosts (e.g. Vercel) have a read-only filesystem, so the
      // SDK's file-based loadConfig() cannot find .z-ai-config. The class
      // constructor accepts the exact same JSON object.
      zaiInstance = new (ZAI as unknown as new (config: Record<string, string>) => ZAI)(
        JSON.parse(configJson)
      );
    } else {
      zaiInstance = await ZAI.create();
    }
  }
  return zaiInstance;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ── Text ──────────────────────────────────────────────────────────────────

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages,
      model: process.env.ZAI_MODEL || undefined,
      thinking: { type: 'disabled' },
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    });
    const content = completion.choices?.[0]?.message?.content;
    if (content && content.trim()) return content;
    throw new Error('Z.ai a renvoyé une réponse vide');
  } catch (error) {
    // Architecture d'autonomie : Z AI n'est qu'un renfort. En cas d'échec
    // (crédits épuisés, indisponibilité, coupure) → Groq puis moteur interne.
    console.error('Z.ai chat failed, activating fallbacks:', error instanceof Error ? error.message : error);
    try {
      const { groqChat } = await import('./autonomy/free-llm');
      const groq = await groqChat(messages, options);
      console.error('Fallback LLM: Groq OK');
      return groq;
    } catch (groqError) {
      console.error('Groq fallback failed:', groqError instanceof Error ? groqError.message : groqError);
    }
    const { freeLLMChat } = await import('./autonomy/free-llm');
    const internal = await freeLLMChat(messages, options);
    console.error('Fallback LLM: moteur interne OK');
    return internal;
  }
}

export async function chatCompletionStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  try {
    const zai = await getZAI();
    const response = await zai.chat.completions.create({
      messages,
      stream: true,
      model: process.env.ZAI_MODEL || undefined,
      thinking: { type: 'disabled' },
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    });

    let fullText = '';

    if (response && typeof response === 'object' && Symbol.asyncIterator in response) {
      for await (const chunk of response as AsyncIterable<any>) {
        const delta = chunk?.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onChunk(delta);
        }
      }
    }
    if (fullText.trim()) return fullText;
    throw new Error('Z.ai stream vide');
  } catch (error) {
    // Repli autonome : réponse complète du moteur interne, émise en un seul
    // passage (le streaming avancé est un confort, pas une condition).
    console.error('Z.ai stream failed, using internal engine:', error instanceof Error ? error.message : error);
    const { groqChat, freeLLMChat } = await import('./autonomy/free-llm');
    let text = '';
    try {
      text = await groqChat(messages, options);
    } catch {
      text = await freeLLMChat(messages, options);
    }
    onChunk(text);
    return text;
  }
}

// ── Image ─────────────────────────────────────────────────────────────────

export async function generateImage(prompt: string, size?: string): Promise<string | null> {
  const targetSize = (size as any) || '1024x1024';
  try {
    const zai = await getZAI();
    const response = await zai.images.generations.create({
      model: process.env.ZAI_IMAGE_MODEL || undefined,
      prompt,
      size: targetSize,
    });
    const item = response.data?.[0];
    if (item?.base64) return item.base64;
    // Public Z.ai API returns a URL instead of base64 — download it.
    const anyItem = item as any;
    if (anyItem?.url) {
      const res = await fetch(anyItem.url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 0) return buf.toString('base64');
      }
    }
    console.error('Z.ai image generation returned no data, trying free fallback');
  } catch (error) {
    console.error('Z.ai image generation failed, trying free fallback:', error);
  }
  return generateImageFree(prompt, targetSize);
}

// Free fallback without API key (Pollinations / flux). Used when the paid
// z.ai path is unavailable (429 insufficient balance, model not exposed).
async function generateImageFree(prompt: string, size: string): Promise<string | null> {
  try {
    const [w, h] = size.split('x').map((n) => parseInt(n, 10) || 1024);
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&model=flux&seed=${seed}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return null;
    return buf.toString('base64');
  } catch (error) {
    console.error('Free image fallback failed:', error);
    return null;
  }
}

// ── Video ─────────────────────────────────────────────────────────────────

export interface VideoTask {
  id: string;
  taskStatus: 'PROCESSING' | 'SUCCESS' | 'FAIL';
}

export interface VideoResult {
  taskStatus: 'PROCESSING' | 'SUCCESS' | 'FAIL';
  videoUrl?: string;
  failMessage?: string;
  [key: string]: any;
}

/** Erreur API structurée (statut HTTP + code métier Z.ai + message). */
export class ZaiApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ZaiApiError';
    this.status = status;
    this.code = code;
  }
}

function zaiPublicConfig(): { baseUrl: string; apiKey: string } {
  const raw = process.env.ZAI_CONFIG_JSON;
  if (raw) {
    try {
      const cfg = JSON.parse(raw) as { baseUrl?: string; apiKey?: string };
      if (cfg.baseUrl && cfg.apiKey) return { baseUrl: cfg.baseUrl.replace(/\/$/, ''), apiKey: cfg.apiKey };
    } catch { /* repli ci-dessous */ }
  }
  throw new ZaiApiError('Configuration API Z.ai absente (ZAI_CONFIG_JSON)', 500);
}

/** Erreur de crédits / ressource manquante (code 1113 côté Z.ai). */
export function isInsufficientBalanceError(e: unknown): boolean {
  if (!(e instanceof ZaiApiError)) return false;
  const msg = (e.message || '').toLowerCase();
  return e.status === 429 || e.code === '1113'
    || msg.includes('balance') || msg.includes('resource package');
}

/**
 * Start an async video generation task. Returns the task ID.
 *
 * Appel HTTP direct (le chemin du SDK /video/generation renvoie 404 sur
 * l'API publique api.z.ai) vers le point réel /videos/generations, avec un
 * modèle explicite (ZAI_VIDEO_MODEL, par défaut cogvideox-3).
 */
export async function createVideoTask(params: {
  prompt?: string;
  imageUrl?: string;
  model?: string;
  quality?: 'speed' | 'quality';
  withAudio?: boolean;
  size?: string;
  fps?: number;
  duration?: number;
}): Promise<VideoTask> {
  const { baseUrl, apiKey } = zaiPublicConfig();
  const body: Record<string, unknown> = {
    model: params.model || process.env.ZAI_VIDEO_MODEL || 'cogvideox-3',
    prompt: params.prompt,
    quality: params.quality ?? 'speed',
    with_audio: params.withAudio ?? false,
    size: params.size ?? '1920x1080',
    fps: params.fps ?? 30,
    duration: params.duration ?? 5,
  };
  if (params.imageUrl) body.image_url = params.imageUrl;

  const res = await fetch(`${baseUrl}/videos/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    let code: string | undefined;
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      code = data?.error?.code ? String(data.error.code) : undefined;
      message = data?.error?.message || message;
    } catch { /* corps non JSON */ }
    throw new ZaiApiError(message, res.status, code);
  }
  const data = await res.json();
  return {
    id: String(data.id || ''),
    taskStatus: (data.task_status || 'PROCESSING') as VideoTask['taskStatus'],
  };
}

/**
 * Poll for video generation result.
 * GET /async-result/{id} (repli : ?id= selon la variante d'API).
 */
export async function getVideoResult(taskId: string): Promise<VideoResult> {
  const { baseUrl, apiKey } = zaiPublicConfig();
  const headers = { Authorization: `Bearer ${apiKey}` };
  let data: any = null;
  let lastStatus = 0;

  for (const url of [`${baseUrl}/async-result/${encodeURIComponent(taskId)}`, `${baseUrl}/async-result?id=${encodeURIComponent(taskId)}`]) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (res.ok) { data = await res.json(); break; }
    lastStatus = res.status;
  }
  if (!data) throw new ZaiApiError(`Interrogation de tâche impossible (HTTP ${lastStatus})`, lastStatus || 500);

  const videoUrl =
    data.video_result?.[0]?.url ||
    data.video_url ||
    data.url ||
    data.video;
  return {
    taskStatus: data.task_status,
    videoUrl: videoUrl || undefined,
    failMessage: data.fail_reason || data.error?.message || undefined,
  };
}

// ── Audio / TTS ───────────────────────────────────────────────────────────

/**
 * Generate text-to-speech audio. Returns the raw Response for streaming/buffer handling.
 */
export async function generateTTS(
  text: string,
  options?: { voice?: string; speed?: number }
): Promise<Response> {
  try {
    const zai = await getZAI();
    return await zai.audio.tts.create({
      input: text,
      voice: options?.voice ?? 'tongtong',
      speed: options?.speed ?? 1.0,
      response_format: 'wav',
      stream: false,
    });
  } catch (error) {
    console.error('Z.ai TTS failed, trying free fallback:', error);
    return generateTTSFree(text);
  }
}

// Free fallback without API key: Google Translate TTS (MP3, ~200 chars max
// per request, so the text is split and the MP3 frames concatenated).
async function generateTTSFree(text: string): Promise<Response> {
  const chunks = text.replace(/\s+/g, ' ').trim().match(/.{1,180}(?:\s|$)/g) || [text.trim()];
  const parts: Buffer[] = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=fr&q=${encodeURIComponent(chunk.trim())}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Free TTS fallback failed: HTTP ${res.status}`);
    parts.push(Buffer.from(await res.arrayBuffer()));
  }
  if (parts.length === 0) throw new Error('Free TTS fallback returned no audio');
  return new Response(Buffer.concat(parts), { headers: { 'content-type': 'audio/mpeg' } });
}