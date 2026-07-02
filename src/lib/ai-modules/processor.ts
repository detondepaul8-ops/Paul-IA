// ── Message Processor ────────────────────────────────────────────────
// Central orchestrator that routes to the correct specialized module.

import { chatCompletion, chatCompletionStream } from '../zai';
import type { ChatMessage } from '../zai';
import type { TaskType } from '../ai-router';
import { MODULE_SYSTEM_PROMPTS } from '../ai-router';
import { processImageRequest } from './image-module';
import { processVideoRequest } from './video-module';
import { processAudioRequest } from './audio-module';

export interface ModuleResponse {
  content: string;
  module: TaskType;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'audio' | null;
}

/**
 * Main entry point: route the message to the appropriate module.
 */
export async function processMessage(
  taskType: TaskType,
  userMessage: string,
  conversationHistory: ChatMessage[],
  _onStream?: (chunk: string) => void
): Promise<ModuleResponse> {
  switch (taskType) {
    case 'image':
      return processImageRequest(userMessage);

    case 'video':
      return processVideoRequest(userMessage);

    case 'audio':
      return processAudioRequest(userMessage);

    // Text-based modules: chat, code, content, project
    default:
      return processTextModule(taskType, userMessage, conversationHistory);
  }
}

/**
 * Handle text-only modules (chat, code, content, project).
 */
async function processTextModule(
  taskType: TaskType,
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<ModuleResponse> {
  const systemPrompt = buildSystemPrompt(taskType);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10),
    { role: 'user', content: userMessage },
  ];

  // IMPORTANT: instruct text modules to NEVER claim media generation
  const mediaGuard = '\n\nRègle critique : tu ne peux PAS générer d\'images, de vidéos ou d\'audio. Si l\'utilisateur demande un média, dis-lui que Paul IA le fera via le module dédié.';

  messages[messages.length - 1] = {
    role: 'user',
    content: userMessage + mediaGuard,
  };

  const content = await chatCompletion(messages, {
    temperature: taskType === 'code' ? 0.3 : 0.7,
    maxTokens: taskType === 'project' ? 8192 : 4096,
  });

  return { content, module: taskType, mediaUrl: null, mediaType: null };
}

/**
 * Build system prompt with media guardrails.
 */
function buildSystemPrompt(taskType: TaskType): string {
  const base = MODULE_SYSTEM_PROMPTS[taskType] || MODULE_SYSTEM_PROMPTS.chat;
  return base + '\n\nRègles absolues :\n- Tu ne génères JAMAIS d\'images, vidéos ou audio directement.\n- Si l\'utilisateur demande un média, recommande d\'utiliser les modules dédiés de Paul IA.\n- Tu ne mentionnes JAMAIS qu\'un média a été généré si ce n\'est pas le cas.';
}

/**
 * Fallback if the specialized module fails.
 */
export async function fallbackResponse(
  userMessage: string,
  _error: Error
): Promise<ModuleResponse> {
  try {
    const content = await chatCompletion([
      {
        role: 'system',
        content: "Tu es Paul IA. Le module spécialisé a échoué. Réponds utilement. Ne mentionne pas l'erreur. Ne génère pas de média.",
      },
      { role: 'user', content: userMessage },
    ]);
    return { content, module: 'chat', mediaUrl: null, mediaType: null };
  } catch {
    return {
      content: "Je suis désolé, une erreur technique est survenue. Veuillez réessayer.",
      module: 'chat',
      mediaUrl: null,
      mediaType: null,
    };
  }
}