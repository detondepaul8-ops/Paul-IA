// ── Video Module ──────────────────────────────────────────────────────────
// 1. Vidéo Z.ai (CogVideoX, async + polling) quand les crédits existent.
// 2. Sinon → MOTEUR INTERNE AUTONOME : MP4 H.264 RÉEL encodé par ffmpeg
//    embarqué (keyframes du moteur interne, Ken Burns, fondus), SANS Z AI
//    ni GROQ ni crédit. 3. Image clé (CogView/Pollinations). 4. Message exact.

import { createVideoTask, getVideoResult, chatCompletion, generateImage, ZaiApiError, isInsufficientBalanceError } from '../zai';
import { saveMediaFromBase64 } from '../media-storage';
import { internalVideo, internalImage, VideoWithoutRealContentError } from '../autonomy/internal-media';
import { verifyMp4 } from '../autonomy/selfcheck';
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

export async function processVideoRequest(
  userMessage: string,
  sourceImages?: Array<{ mime: string; dataBase64: string }>
): Promise<VideoModuleResult> {
  // ── Mode IMAGE → VIDÉO : une image fournie (upload) est réellement
  // transformée en vidéo par le moteur interne (mouvement de caméra
  // Ken Burns, encodage H.264 local). Aucun service payant nécessaire.
  if (sourceImages?.length && sourceImages[0]?.dataBase64) {
    return await imageToVideo(userMessage, sourceImages[0].dataBase64);
  }

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

    // Crédits vidéo insuffisants (code 1113) → moteur interne autonome :
    // vraie vidéo MP4 produite par Paul IA elle-même, puis image clé.
    if (isInsufficientBalanceError(error)) {
      return await internalVideoFallback(userMessage, scenario,
        "Le moteur d'appui externe n'est pas actuellement crédité pour la génération vidéo (code 1113 : « Insufficient balance or no resource package »).");
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
      return await internalVideoFallback(userMessage, scenario,
        `la création de la tâche CogVideoX a échoué côté Z.ai.${detail}`);
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

/** Mode IMAGE → VIDÉO réel : l'image fournie devient une vidéo MP4 avec
 *  mouvement de caméra (Ken Burns), produite et vérifiée localement.
 *  Aucune fausse réussite : en cas d'échec, la cause technique réelle
 *  est expliquée et aucune vidéo n'est annoncée. */
async function imageToVideo(
  userMessage: string,
  imageBase64: string
): Promise<VideoModuleResult> {
  try {
    const video = await internalVideo({
      prompt: userMessage,
      imageBase64,
      scenes: 1,
      size: '1280x720',
      secondsPerScene: 5,
      timeoutMs: 40000,
    });
    const check = verifyMp4(video.mp4);
    if (!check.ok) throw new Error('fichier MP4 produit non conforme : ' + check.checks.filter(c => !c.ok).map(c => c.name).join(', '));
    const stored = await saveMediaFromBase64(video.mp4.toString('base64'), 'video');
    if (!stored?.url) throw new Error('enregistrement de la vidéo impossible');
    return {
      content: `Votre vidéo est prête ci-dessous : elle a été créée réellement À PARTIR DE VOTRE IMAGE par le moteur interne de Paul IA — mouvement de caméra (zoom progressif avant/arrière), fondu d'ouverture, rendu MP4 ${video.totalSeconds}s en 1280x720 (H.264), vérifié avant livraison.`,
      module: 'video',
      mediaUrl: stored.url,
      mediaType: 'video',
    };
  } catch (error) {
    const cause = (error as Error).message.slice(0, 300);
    return {
      content: `La transformation de votre image en vidéo n'a pas abouti cette fois. Cause technique réelle : ${cause}. Aucune vidéo n'a été produite — je ne prétends pas le contraire. Vous pouvez : (1) réessayer maintenant, (2) demander une vidéo texte-vers-vidéo sur le même thème (« crée une vidéo : … ») — le moteur interne autonome produira un MP4 réel, (3) réenvoyer votre image si elle est très grande (l'optimale est ≤ 4 Mo).`,
      module: 'video',
      mediaUrl: null,
      mediaType: null,
    };
  }
}

/** Repli AUTONOME : vraie vidéo MP4 par le moteur interne (ffmpeg embarqué,
 *  keyframes RÉELLES sans clé ni crédit), puis image clé, puis message exact.
 *  AUCUNE vidéo sans contenu : si aucune image réelle du scénario n'est
 *  obtenable, on livre l'image clé et on explique précisément la limitation. */
async function internalVideoFallback(
  userMessage: string,
  scenario: { prompt: string; description: string },
  cause: string
): Promise<VideoModuleResult> {
  try {
    const video = await internalVideo({
      prompt: scenario.prompt,
      scenes: 3,
      size: '1280x720',
      secondsPerScene: 3,
      timeoutMs: 40000,
      useCogFallback: true,
    });
    const check = verifyMp4(video.mp4);
    if (check.ok) {
      const stored = await saveMediaFromBase64(video.mp4.toString('base64'), 'video');
      if (stored?.url) {
        return {
          content: `${scenario.description}\n\nLa vidéo ci-dessous a été produite par le MOTEUR INTERNE de Paul IA (rendu MP4 ${video.totalSeconds}s, ${video.scenes} scènes, encodage H.264 local, images réelles du scénario : ${video.engines.join(', ')}), sans recours aux services externes de génération vidéo. Cause du repli : ${cause}`,
          module: 'video',
          mediaUrl: stored.url,
          mediaType: 'video',
        };
      }
    }
    console.error('Internal video failed checks:', check);
  } catch (internalError) {
    if (internalError instanceof VideoWithoutRealContentError) {
      console.error('Moteur vidéo interne refusé (contenu vide):', internalError.message);
      return await keyFrameFallback(
        userMessage, scenario,
        `${cause} De plus, le moteur interne n'a pas obtenu d'images réelles du scénario (${internalError.message}) — aucune vidéo sans contenu ne vous est livrée.`
      );
    }
    console.error('Internal video engine failed:', internalError);
  }
  return keyFrameFallback(userMessage, scenario, cause);
}

/** Repli réel : image clé du scénario (moteur d'appui puis moteur ouvert). */
async function keyFrameFallback(
  userMessage: string,
  scenario: { prompt: string; description: string },
  cause: string
): Promise<VideoModuleResult> {
  try {
    let base64 = await generateImage(`${scenario.prompt}, cinematic key frame, highly detailed`, '1280x720');
    let engine = "moteur image d'appui";
    if (!base64) {
      const alt = await internalImage(`${scenario.prompt}, cinematic key frame, highly detailed`, '1280x720', 20000).catch(() => null);
      if (alt) { base64 = alt.base64; engine = 'moteur image ouvert'; }
    }
    if (base64) {
      const stored = await saveMediaFromBase64(base64, 'image');
      if (stored?.url) {
        return {
          content: `La vidéo n'a pas pu être lancée : ${cause}\n\nEn attendant, voici l'IMAGE CLÉ de votre scénario, générée réellement par le ${engine} : ${scenario.description}\n\nPour obtenir la vidéo complète, réessayez dans quelques instants : le moteur alterne automatiquement plusieurs sources d'images réelles avant d'assembler le MP4. Aucune vidéo sans contenu réel ne vous sera jamais livrée.`,
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
    content: `La création de la vidéo a échoué : ${cause} Le scénario a été préparé avec succès (${scenario.description}) mais ni la vidéo ni l'image clé n'ont pu être produites pour le moment — aucun fichier ne vous est livré. Réessayez dans quelques instants.`,
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