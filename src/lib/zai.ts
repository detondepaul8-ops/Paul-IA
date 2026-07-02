import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: ZAI | null = null;

export async function getZAI(): Promise<ZAI> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
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
  try {
    const zai = await getZAI();
    const response = await zai.images.generations.create({
      prompt,
      size: (size as any) || '1024x1024',
    });
    return response.data?.[0]?.base64 ?? null;
  } catch (error) {
    console.error('Image generation failed:', error);
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
  const zai = await getZAI();
  return zai.audio.tts.create({
    input: text,
    voice: options?.voice ?? 'tongtong',
    speed: options?.speed ?? 1.0,
    response_format: 'wav',
    stream: false,
  });
}