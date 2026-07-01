import { chatCompletion, chatCompletionStream, generateImage } from './zai';
import type { ChatMessage } from './zai';
import type { TaskType } from './ai-router';
import { MODULE_SYSTEM_PROMPTS } from './ai-router';

export interface ModuleResponse {
  content: string;
  module: TaskType;
  imageBase64?: string | null;
}

export async function processMessage(
  taskType: TaskType,
  userMessage: string,
  conversationHistory: ChatMessage[],
  onStream?: (chunk: string) => void
): Promise<ModuleResponse> {
  const systemPrompt = MODULE_SYSTEM_PROMPTS[taskType];

  // For image generation, extract a clean prompt
  if (taskType === 'image') {
    const imagePrompt = await extractImagePrompt(userMessage, systemPrompt);
    const imageBase64 = await generateImage(imagePrompt);

    if (imageBase64) {
      const caption = await generateImageCaption(userMessage);
      return {
        content: caption,
        module: 'image',
        imageBase64: `data:image/png;base64,${imageBase64}`,
      };
    }

    return {
      content: "Désolé, je n'ai pas pu générer l'image demandée. Veuillez réessayer avec une description plus détaillée.",
      module: 'image',
      imageBase64: null,
    };
  }

  // For text-based modules (chat, code, content, project)
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10),
    { role: 'user', content: userMessage },
  ];

  if (onStream) {
    const fullText = await chatCompletionStream(messages, onStream, {
      temperature: taskType === 'code' ? 0.3 : 0.7,
      maxTokens: taskType === 'project' ? 8192 : 4096,
    });
    return { content: fullText, module: taskType };
  } else {
    const content = await chatCompletion(messages, {
      temperature: taskType === 'code' ? 0.3 : 0.7,
      maxTokens: taskType === 'project' ? 8192 : 4096,
    });
    return { content, module: taskType };
  }
}

async function extractImagePrompt(userMessage: string, systemPrompt: string): Promise<string> {
  try {
    const prompt = await chatCompletion([
      {
        role: 'system',
        content: `${systemPrompt}\n\nTransforme la demande de l'utilisateur en un prompt d'image détaillé et visuel en anglais. Réponds UNIQUEMENT avec le prompt d'image, sans explication ni guillemets.`,
      },
      { role: 'user', content: userMessage },
    ], { temperature: 0.5, maxTokens: 200 });
    return prompt.trim().replace(/^["']|["']$/g, '');
  } catch {
    return userMessage;
  }
}

async function generateImageCaption(userMessage: string): Promise<string> {
  try {
    return await chatCompletion([
      {
        role: 'system',
        content: "Tu es un assistant qui confirme la génération d'une image. Réponds brièvement en français (1-2 phrases) pour confirmer que l'image a été générée selon la demande.",
      },
      { role: 'user', content: `Confirme que tu as généré cette image: "${userMessage}"` },
    ], { temperature: 0.5, maxTokens: 100 });
  } catch {
    return "Voici l'image générée selon votre demande :";
  }
}

export async function fallbackResponse(
  userMessage: string,
  _error: Error
): Promise<ModuleResponse> {
  try {
    const content = await chatCompletion([
      {
        role: 'system',
        content: "Tu es Paul IA. Le module spécialisé a échoué. Réponds quand même de manière utile à l'utilisateur. Ne mentionne pas l'erreur technique.",
      },
      { role: 'user', content: userMessage },
    ]);
    return { content, module: 'chat' };
  } catch {
    return {
      content: "Je suis désolé, une erreur technique est survenue. Veuillez réessayer.",
      module: 'chat',
    };
  }
}