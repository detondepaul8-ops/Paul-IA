// ── Video Module ──────────────────────────────────────────────────────────
// Handles REAL video generation via async API with polling.

import { createVideoTask, getVideoResult, chatCompletion } from '../zai';
import { MODULE_SYSTEM_PROMPTS } from '../ai-router';
import type { TaskType } from '../ai-router';

export interface VideoModuleResult {
  content: string;
  module: 'video';
  mediaUrl: string | null;
  mediaType: 'video' | null;
  videoTaskId?: string;
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60;

export async function processVideoRequest(userMessage: string): Promise<VideoModuleResult> {
  // Step 1: Generate a detailed video scenario/prompt
  const scenario = await generateVideoScenario(userMessage);

  // Step 2: Create the video generation task (async)
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
    return {
      content: "La création de la tâche vidéo a échoué. Le service de génération vidéo est peut-être temporairement indisponible. Veuillez réessayer dans quelques instants.",
      module: 'video',
      mediaUrl: null,
      mediaType: null,
    };
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
    ? "La génération a échoué côté serveur."
    : `Le délai d'attente a été dépassé après ${MAX_POLLS * POLL_INTERVAL_MS / 1000}s.`;

  return {
    content: `Désolé, ${failReason} Votre scénario a été préparé avec succès, mais le rendu n'a pas pu aboutir. Suggestions :\n- Simplifiez votre demande\n- Réduisez la durée demandée\n- Réessayez dans quelques instants`,
    module: 'video',
    mediaUrl: null,
    mediaType: null,
    videoTaskId: task.id,
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