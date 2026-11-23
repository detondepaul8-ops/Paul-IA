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
 * `sourceImages` : images fournies par l'utilisateur (base64 sans en-tête) —
 * elles alimentent le moteur image → vidéo quand la demande en a besoin.
 */
export async function processMessage(
  taskType: TaskType,
  userMessage: string,
  conversationHistory: ChatMessage[],
  _onStream?: (chunk: string) => void,
  sourceImages?: Array<{ mime: string; dataBase64: string }>
): Promise<ModuleResponse> {
  switch (taskType) {
    case 'image':
      return processImageRequest(userMessage);

    case 'video':
      return processVideoRequest(userMessage, sourceImages);

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
/** Filet de sécurité : détecte une affirmation FAUSSE de limitation textuelle
 *  (« je suis un assistant textuel uniquement », « je ne peux pas générer
 *  d'images/vidéos ») dans la réponse d'un module texte, alors que les moteurs
 *  multimédia de l'application existent réellement. Dans ce cas la demande est
 *  IMMÉDIATEMENT déclenchée par le moteur correspondant — Paul IA répond ET agit. */
const FALSE_TEXTUAL_LIMITATION =
  /\b(assistant\s+textuel|textuel\s+uniquement|uniquement\s+textuel)\b|\bne\s+(peux|peut)\s+pas\s+(g[ée]n[ée]rer|cr[ée]er|produire|faire)\b[^.\n]{0,80}\b(image|images|vid[ée]o|vid[ée]os|photo|dessin|visuel)\b/i;

function detectsMediaRequest(userMessage: string): 'image' | 'video' | null {
  if (/\b(vid[ée]o|video|clip|film|animation|anim[ée]e?|motion)\b/i.test(userMessage)) return 'video';
  if (/\b(image|images|photo|dessin|dessine|illustration|visuel|logo|banni[èe]re|miniature)\b/i.test(userMessage)) return 'image';
  return null;
}

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

  const content = await chatCompletion(messages, {
    temperature: taskType === 'code' ? 0.3 : 0.7,
    maxTokens: taskType === 'project' ? 8192 : 4096,
  });

  // Filet de sécurité : le modèle ne doit JAMAIS nier les capacités réelles.
  // Si c'est le cas malgré les instructions, on déclenche le moteur réel.
  if (FALSE_TEXTUAL_LIMITATION.test(content)) {
    const mediaKind = detectsMediaRequest(userMessage);
    if (mediaKind === 'image') {
      console.warn('Filet de sécurité : négation de capacité détectée → moteur image réel');
      return await processImageRequest(userMessage);
    }
    if (mediaKind === 'video') {
      console.warn('Filet de sécurité : négation de capacité détectée → moteur vidéo réel');
      return await processVideoRequest(userMessage);
    }
  }

  return { content, module: taskType, mediaUrl: null, mediaType: null };
}

/**
 * Build system prompt with media guardrails in the SYSTEM message (not user message).
 */
export function buildSystemPrompt(taskType: TaskType): string {
  const base = MODULE_SYSTEM_PROMPTS[taskType] || MODULE_SYSTEM_PROMPTS.chat;
  return base + `\n\nCAPACITÉS RÉELLES DE PAUL IA (application intégrée) :
- PAUL IA dispose de MOTEURS INTÉGRÉS qui génèrent réellement des IMAGES et des VIDÉOS MP4 (moteurs internes et d'appui, avec repli autonome). Ces moteurs font partie de ton application : une demande de création multimédia est automatiquement prise en charge par le moteur correspondant.
- Tu n'es PAS un assistant « textuel uniquement ». Ne dis JAMAIS « je ne peux pas générer d'images ou de vidéos » — c'est faux et contredit les capacités réelles de l'application.
- Si l'utilisateur demande une image ou une vidéo, agis en coordinateur : décris brièvement ce que tu prépares (scène, style) ; la génération est déclenchée par les moteurs dédiés et le fichier réel apparaît dans la conversation.
- HONNÊTETÉ ABSOLUE : ne dis JAMAIS qu'une image ou une vidéo a été produite si aucun fichier réel n'a été généré. Si un moteur est indisponible, explique précisément la limitation technique réelle et les alternatives.
- Tu génères toi-même : texte, code, documents (Excel/PDF), recherches documentées.`;
}

/**
 * Fallback si le module spécialisé échoue : explication PRÉCISE de la
 * limitation technique réelle — jamais de fausse réussite, jamais
 * d'affirmation « je suis un assistant textuel uniquement » (les moteurs
 * multimédia de l'application existent réellement).
 */
export async function fallbackResponse(
  userMessage: string,
  error: Error
): Promise<ModuleResponse> {
  const cause = (error?.message || 'incident technique').slice(0, 300);
  const isMediaRequest = /\b(image|images|vidéo|video|photo|dessin|illustration|animation|clip|film|anime|animer)\b/i.test(userMessage);
  const mediaNote = isMediaRequest
    ? `\n\nLa génération multimédia est bien intégrée à l'application (moteurs d'images et de vidéos), mais le moteur sollicité n'a pas abouti cette fois. Cause technique réelle : ${cause}. Ce n'est pas un refus : réessayez — le moteur alterne automatiquement plusieurs méthodes de génération.`
    : '';
  try {
    const content = await chatCompletion([
      {
        role: 'system',
        content: `Tu es Paul IA. Un service interne a échoué pendant le traitement. Règles impératives :
- N'invente JAMAIS un résultat : ne dis jamais qu'un média a été produit — aucun fichier n'a été généré.
- N'affirme JAMAIS que tu es un assistant textuel ou que tu « ne peux pas générer d'images/vidéos » : les moteurs multimédia de l'application existent réellement.
- Explique honnêtement que le service n'a pas abouti cette fois, puis donne la meilleure réponse textuelle possible à la demande.
- Réponds en français, de façon concise et utile.`,
      },
      { role: 'user', content: userMessage },
    ]);
    return { content: content + mediaNote, module: 'chat', mediaUrl: null, mediaType: null };
  } catch {
    return {
      content: `Une erreur technique est survenue pendant le traitement de votre demande. Cause réelle : ${cause}.${mediaNote}`,
      module: 'chat',
      mediaUrl: null,
      mediaType: null,
    };
  }
}