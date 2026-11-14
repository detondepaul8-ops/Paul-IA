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
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages,
    model: process.env.ZAI_MODEL || undefined,
    thinking: { type: 'disabled' },
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
  });
  return completion.choices?.[0]?.message?.content ?? '';
}

export async function chatCompletionStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
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

  return fullText;
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
    if (item?.url) {
      const res = await fetch(item.url);
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
  [key: string]: any;
}

/**
 * Start an async video generation task. Returns the task ID.
 */
export async function createVideoTask(params: {
  prompt?: string;
  imageUrl?: string;
  quality?: 'speed' | 'quality';
  withAudio?: boolean;
  size?: string;
  fps?: number;
  duration?: number;
}): Promise<VideoTask> {
  const zai = await getZAI();
  const task = await zai.video.generations.create({
    prompt: params.prompt,
    image_url: params.imageUrl,
    quality: params.quality ?? 'speed',
    with_audio: params.withAudio ?? false,
    size: params.size ?? '1920x1080',
    fps: params.fps ?? 30,
    duration: params.duration ?? 5,
  });
  return {
    id: task.id,
    taskStatus: task.task_status,
  };
}

/**
 * Poll for video generation result.
 */
export async function getVideoResult(taskId: string): Promise<VideoResult> {
  const zai = await getZAI();
  const result = await zai.async.result.query(taskId);
  const videoUrl =
    result.video_result?.[0]?.url ||
    result.video_url ||
    result.url ||
    result.video;
  return {
    taskStatus: result.task_status,
    videoUrl: videoUrl || undefined,
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