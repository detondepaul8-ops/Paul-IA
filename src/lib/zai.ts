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

export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const zai = await getZAI();
    const response = await zai.images.generations.create({
      prompt,
      size: '1024x1024',
    });
    return response.data?.[0]?.base64 ?? null;
  } catch {
    return null;
  }
}