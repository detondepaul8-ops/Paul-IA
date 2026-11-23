// ── Video Module ──────────────────────────────────────────────────────────
// Handles REAL video generation via async API with polling.
// Si les crédits vidéo Z.ai sont indisponibles (code 1113), repli réel :
// une image clé du scénario est générée (CogView, secours Pollinations)
// et l'erreur exacte est expliquée à l'utilisateur.

import { createVideoTask, getVideoResult, chatCompletion, generateImage, ZaiApiError, isInsufficientBalanceError } from '../zai';
import { saveMediaFromBase64 } from '../media-storage';
import { MODULE_SYSTEM_PROMPTS } from '../ai-router';
import type { TaskType } from '../ai-router';

export interface VideoModuleResult {
  content: string;
  module: 'video';
  mediaUrl: string | null;
  mediaType: 'video' | 'image' | null;
  videoTaskId?: string;
}

// Must fit inside the route's maxDuration (60s): ~50s of polling + task creation + DB saves.
const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 10;

export async function processVideoRequest(userMessage: string): Promise<VideoModuleResult> {
  // Step 1: Generate a detailed video scenario/prompt
  const scenario = await generateVideoScenario(userMessage);

  // Step 2: Create the video generation task (async, endpoint réel + modèle explicite)
  let task;
  try {
    task = await createVideoTask({
      prompt: scenario.prompt,
      quality: 'speed',
      size: '1280x720',
      fps: 30,
      duration: 5,
    });
  } catch (error) {
    console.error('Video task creation failed:', error);

    // Crédits vidéo insuffisants (code 1113) : repli réel sur l'image clé
    // du scénario + explication exacte, au lieu d'un échec générique.
    if (isInsufficientBalanceError(error)) {
      return await keyFrameFallback(userMessage, scenario,
        "Le compte Z.ai ne dispose pas actuellement de crédits de génération vidéo (code 1113 : « Insufficient balance or no resource package »).");
    }

    // Autre erreur : une tentative avec le modèle de second choix, puis échec honnête
    try {
      task = await createVideoTask({
        prompt: scenario.prompt,
        model: 'cogvideox-2',
        quality: 'speed',
        size: '1280x720',
        fps: 30,
        duration: 5,
      });
    } catch (retryError) {
      console.error('Video task creation retry failed:', retryError);
      const detail = retryError instanceof ZaiApiError ? ` Cause exacte : ${retryError.message}.` : '';
      return {
        content: `La création de la tâche vidéo a échoué côté service de génération.${detail} Le scénario a été préparé avec succès : reformulez votre demande dans quelques instants, ou reformulez-la en demande d'image (« génère une image : … ») qui fonctionne sans crédits vidéo.`,
        module: 'video',
        mediaUrl: null,
        mediaType: null,
      };
    }
  }

  // Step 3: Poll until completion or timeout
  let result = await getVideoResult(task.id);
  let pollCount = 0;

  while (result.taskStatus === 'PROCESSING' && pollCount < MAX_POLLS) {
    pollCount++;
    await sleep(POLL_INTERVAL_MS);
    result = await getVideoResult(task.id);
  }

  // Step 4: Check result
  if (result.taskStatus === 'SUCCESS' && result.videoUrl) {
    return {
      content: `${scenario.description}\n\nLa vidéo a été générée avec succès et est prête à la lecture ci-dessous.`,
      module: 'video',
      mediaUrl: result.videoUrl,
      mediaType: 'video',
      videoTaskId: task.id,
    };
  }

  // Generation failed or timed out
  const failReason = result.taskStatus === 'FAIL'
    ? `La génération a échoué côté serveur${result.failMessage ? ` (${result.failMessage})` : ''}.`
    : `Le délai d'attente a été dépassé après ${MAX_POLLS * POLL_INTERVAL_MS / 1000}s.`;

  return {
    content: `Désolé, ${failReason} Votre scénario a été préparé avec succès, mais le rendu n'a pas pu aboutir. Suggestions :\n- Simplifiez votre demande\n- Réduisez la durée demandée\n- Réessayez dans quelques instants`,
    module: 'video',
    mediaUrl: null,
    mediaType: null,
    videoTaskId: task.id,
  };
}

/** Repli réel quand la vidéo est indisponible : image clé du scénario
 *  (pipeline image complet : CogView puis Pollinations), message exact. */
async function keyFrameFallback(
  userMessage: string,
  scenario: { prompt: string; description: string },
  cause: string
): Promise<VideoModuleResult> {
  try {
    const base64 = await generateImage(`${scenario.prompt}, cinematic key frame, highly detailed`, '1280x720');
    if (base64) {
      const stored = await saveMediaFromBase64(base64, 'image');
      if (stored?.url) {
        return {
          content: `La vidéo n'a pas pu être lancée : ${cause}\n\nEn attendant, voici l'IMAGE CLÉ de votre scénario, générée réellement : ${scenario.description}\n\nPour débloquer la vidéo complète, rechargez les crédits vidéo du compte Z.ai (modèle CogVideoX). En attendant, vous pouvez obtenir une séquence en demandant plusieurs images (« génère une image : … »).`,
          module: 'video',
          mediaUrl: stored.url,
          mediaType: 'image',
        };
      }
    }
  } catch (fallbackError) {
    console.error('Video key-frame fallback failed:', fallbackError);
  }
  return {
    content: `La création de la tâche vidéo a échoué : ${cause} Le scénario a été préparé avec succès (${scenario.description}) mais ni la vidéo ni l'image clé n'ont pu être produites pour le moment. Réessayez dans quelques instants.`,
    module: 'video',
    mediaUrl: null,
    mediaType: null,
  };
}

async function generateVideoScenario(userMessage: string): Promise<{ prompt: string; description: string }> {
  try {
    const response = await chatCompletion([
      {
        role: 'system',
        content: `Tu es un réalisateur IA expert. Tu transformes la demande de l'utilisateur en scénario vidéo optimisé.

Tu dois répondre en JSON avec exactement deux champs :
1. "prompt" : un prompt vidéo détaillé en ANGLAIS (40-100 mots), décrivant la scène, les mouvements, l'éclairage, le style visuel
2. "description" : une description en FRANÇAIS (2-3 phrases) du scénario que tu as préparé

Réponds UNIQUEMENT avec le JSON, sans markdown ni explication.`,
      },
      { role: 'user', content: userMessage },
    ], { temperature: 0.6, maxTokens: 300 });

    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        prompt: String(parsed.prompt || userMessage),
        description: String(parsed.description || 'Scénario vidéo préparé.'),
      };
    }
  } catch (error) {
    console.error('Video scenario generation failed:', error);
  }

  return {
    prompt: userMessage,
    description: 'Scénario vidéo généré à partir de votre demande.',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}