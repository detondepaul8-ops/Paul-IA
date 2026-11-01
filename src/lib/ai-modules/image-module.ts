// ── Image Module ──────────────────────────────────────────────────────────
// Handles image generation, prompt optimization, and file persistence.

import { generateImage, chatCompletion } from '../zai';
import { saveMediaFromBase64 } from '../media-storage';
import { MODULE_SYSTEM_PROMPTS } from '../ai-router';

export interface ImageModuleResult {
  content: string;
  module: 'image';
  mediaUrl: string | null;
  mediaType: 'image' | null;
}

export async function processImageRequest(userMessage: string): Promise<ImageModuleResult> {
  // Step 1: Analyze and enhance the user prompt
  const enhancedPrompt = await enhanceImagePrompt(userMessage);

  // Step 2: Generate the image
  const base64 = await generateImage(enhancedPrompt);
  if (!base64) {
    return {
      content: "Désolé, la génération de l'image a échoué. Veuillez reformuler votre demande avec plus de détails visuels (couleurs, style, éclairage, composition).",
      module: 'image',
      mediaUrl: null,
      mediaType: null,
    };
  }

  // Step 3: Save to disk for persistence
  const stored = await saveMediaFromBase64(base64, 'image');

  // Step 4: Generate a contextual caption
  const caption = await generateCaption(userMessage);

  return {
    content: caption,
    module: 'image',
    mediaUrl: stored.url,
    mediaType: 'image',
  };
}

async function enhanceImagePrompt(userMessage: string): Promise<string> {
  try {
    return await chatCompletion([
      {
        role: 'system',
        content: `${MODULE_SYSTEM_PROMPTS.image}\n\nTu dois transformer la demande de l'utilisateur en un prompt d'image optimisé en ANGLAIS pour un modèle de génération d'images.
Règles :
- Décris le sujet, le style, l'éclairage, les couleurs, la composition
- Ajoute des détails de qualité : "highly detailed", "professional", "4K"
- Utilise 30-80 mots
- Réponds UNIQUEMENT avec le prompt optimisé, sans explication ni guillemets`,
      },
      { role: 'user', content: userMessage },
    ], { temperature: 0.6, maxTokens: 200 });
  } catch {
    return userMessage;
  }
}

async function generateCaption(userMessage: string): Promise<string> {
  try {
    return await chatCompletion([
      {
        role: 'system',
        content: "Tu es Paul IA. Confirme brièvement la génération d'une image en français. 1-2 phrases maximum. Sois naturel et chaleureux.",
      },
      { role: 'user', content: `Confirme la génération de cette image : "${userMessage}"` },
    ], { temperature: 0.5, maxTokens: 100 });
  } catch {
    return "Voici l'image générée selon votre demande :";
  }
}