// ── Audio Module ──────────────────────────────────────────────────────────
// Handles TTS generation and file persistence.

import { generateTTS, chatCompletion } from '../zai';
import { saveMediaFromBuffer } from '../media-storage';
import { MODULE_SYSTEM_PROMPTS } from '../ai-router';

export interface AudioModuleResult {
  content: string;
  module: 'audio';
  mediaUrl: string | null;
  mediaType: 'audio' | null;
}

export async function processAudioRequest(userMessage: string): Promise<AudioModuleResult> {
  // Step 1: Determine what text to speak
  const textToSpeak = await extractSpeechText(userMessage);

  // Step 2: Generate TTS audio
  let response: Response;
  try {
    response = await generateTTS(textToSpeak, {
      voice: 'tongtong',
      speed: 1.0,
    });
  } catch (error) {
    console.error('TTS generation failed:', error);
    return {
      content: "La génération audio a échoué. Veuillez réessayer avec un texte plus court ou reformulez votre demande.",
      module: 'audio',
      mediaUrl: null,
      mediaType: null,
    };
  }

  // Step 3: Convert response to buffer and save
  try {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const stored = await saveMediaFromBuffer(buffer, 'audio', 'wav');

    const preview = textToSpeak.length > 100
      ? textToSpeak.slice(0, 100) + '...'
      : textToSpeak;

    return {
      content: `Voici l'audio généré :\n\n"${preview}"`,
      module: 'audio',
      mediaUrl: stored.url,
      mediaType: 'audio',
    };
  } catch (error) {
    console.error('Audio save failed:', error);
    return {
      content: "L'audio a été généré mais n'a pas pu être sauvegardé. Veuillez réessayer.",
      module: 'audio',
      mediaUrl: null,
      mediaType: null,
    };
  }
}

async function extractSpeechText(userMessage: string): Promise<string> {
  try {
    return await chatCompletion([
      {
        role: 'system',
        content: `Tu es Paul IA. L'utilisateur demande de générer un audio ou une voix.
Extrais le texte exact qui doit être lu à voix haute. Règles :
- Réponds UNIQUEMENT avec le texte à lire, sans guillemets ni explication
- Si l'utilisateur décrit un contenu à créer (poème, discours, etc.), rédige-le
- Maximum 500 caractères
- Écris en français sauf si l'utilisateur demande une autre langue`,
      },
      { role: 'user', content: userMessage },
    ], { temperature: 0.4, maxTokens: 400 });
  } catch {
    return userMessage;
  }
}