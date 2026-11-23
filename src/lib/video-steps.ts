// ── Vidéo par ÉTAPES serverless ──────────────────────────────────────────
// Constat mesuré en production (/api/diag-network depuis Vercel) : la source
// d'images publique renvoie 200 pour ~1 image, puis 402 (quota de débit par
// IP) pendant ~10-15 s — et les IP Vercel sont partagées. Générer 2 scènes +
// assembler un MP4 dépasse donc STRUCTURELLEMENT les 60 s d'une fonction
// serverless. Solution : la tâche AVANCE à chaque consultation de progression
// (GET /api/tasks/{id}) — un appel = une scène ou l'assemblage. Chaque appel
// reste court, le film se construit en quelques consultations.
import { db } from './db';
import { internalImage, internalVideo, scenePrompts } from './autonomy/internal-media';
import { verifyMp4 } from './autonomy/selfcheck';
import { saveMediaFromBase64 } from './media-storage';
import { chatCompletion, generateImage } from './zai';
import { logEvent, finishTask } from './monitor';

export interface VideoStepState {
  scenarioPrompt: string;
  description: string;
  scenePromptsList: string[];
  sceneMediaIds: (string | null)[];
  tries: number[];
  lockAt?: number;
  done?: boolean;
}

const MAX_TRIES_PER_SCENE = 4;

/** Démarrage : scénario rapide + plan de scènes, stocké dans la tâche. */
export async function startVideoSteps(taskId: string, userMessage: string): Promise<{ description: string; scenes: number }> {
  let scenarioPrompt = userMessage;
  let description = 'Scénario vidéo préparé à partir de votre demande.';
  try {
    const r = await chatCompletion([
      {
        role: 'system',
        content: `Tu es un réalisateur IA. Réponds UNIQUEMENT en JSON avec deux champs : {"prompt":"prompt vidéo détaillé en ANGLAIS, 40-80 mots, scène visuelle précise","description":"2 phrases en FRANÇAIS décrivant le scénario préparé"}.`,
      },
      { role: 'user', content: userMessage },
    ], { temperature: 0.6, maxTokens: 300 });
    const m = r.match(/\{[\s\S]*?\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      scenarioPrompt = String(parsed.prompt || userMessage);
      description = String(parsed.description || description);
    }
  } catch {
    // Repli : la demande brute reste exploitable par le moteur interne.
  }

  const scenePromptsList = scenePrompts(scenarioPrompt, 2);
  const state: VideoStepState = {
    scenarioPrompt,
    description,
    scenePromptsList,
    sceneMediaIds: scenePromptsList.map(() => null),
    tries: scenePromptsList.map(() => 0),
  };
  await db.paul_Task.update({ where: { id: taskId }, data: { result: JSON.stringify(state) } });
  await logEvent(taskId, {
    step: 'plan',
    label: `Scénario prêt : ${scenePromptsList.length} scènes réelles à peindre, puis assemblage MP4.`,
    detail: description,
    status: 'done',
  });
  return { description, scenes: scenePromptsList.length };
}

/** Un PAS de travail par consultation : une scène manquante, ou l'assemblage
 *  final. Aucune génération en parallèle (le quota d'images l'interdit). */
export async function advanceVideoSteps(taskId: string): Promise<void> {
  const task = await db.paul_Task.findUnique({ where: { id: taskId } });
  if (!task || task.module !== 'video' || task.status !== 'running') return;

  let state: VideoStepState;
  try { state = JSON.parse(task.result || '{}'); } catch { return; }
  if (!state.scenePromptsList?.length || state.done) return;

  // Verrou optimiste : un seul poll travaille à la fois.
  const locked: VideoStepState = { ...state, lockAt: Date.now() };
  const claim = await db.paul_Task.updateMany({
    where: { id: taskId, result: task.result },
    data: { result: JSON.stringify(locked) },
  });
  if (claim.count === 0) return; // un autre appel avance déjà

  const saveState = async (s: VideoStepState) => {
    await db.paul_Task.update({ where: { id: taskId }, data: { result: JSON.stringify(s) } });
  };

  // 1) Peindre la première scène manquante.
  const nextIdx = locked.sceneMediaIds.findIndex((m) => !m);
  if (nextIdx >= 0) {
    const t0 = Date.now();
    await logEvent(taskId, {
      step: `scene-${nextIdx}`,
      label: `Je peins la scène ${nextIdx + 1}/${locked.scenePromptsList.length} : image réelle du scénario.`,
      status: 'running',
    });
    try {
      const img = await internalImage(locked.scenePromptsList[nextIdx], '1280x720', 20000);
      const stored = await saveMediaFromBase64(img.base64, 'image');
      if (!stored?.url) throw new Error('enregistrement de la scène impossible');
      locked.sceneMediaIds[nextIdx] = stored.url.replace('/api/media/', '');
      locked.tries[nextIdx] = (locked.tries[nextIdx] || 0) + 1;
      await saveState(locked);
      await logEvent(taskId, {
        step: `scene-${nextIdx}`,
        label: `Scène ${nextIdx + 1} prête en ${Math.round((Date.now() - t0) / 1000)} s — source : ${img.engine}.`,
        status: 'done',
      });
      const done = locked.sceneMediaIds.filter(Boolean).length;
      await db.paul_Task.update({
        where: { id: taskId },
        data: { progress: Math.min(80, Math.round((done / locked.scenePromptsList.length) * 80)) },
      });
      return;
    } catch (e) {
      locked.tries[nextIdx] = (locked.tries[nextIdx] || 0) + 1;
      await saveState(locked);
      const msg = (e as Error).message.slice(0, 140);
      if (locked.tries[nextIdx] >= MAX_TRIES_PER_SCENE) {
        await logEvent(taskId, {
          step: `scene-${nextIdx}`,
          label: `Scène ${nextIdx + 1} impossible après ${MAX_TRIES_PER_SCENE} essais espacés : ${msg}`,
          status: 'warning',
        });
        const allResolved = locked.scenePromptsList.every((_, i) => locked.sceneMediaIds[i] || (locked.tries[i] || 0) >= MAX_TRIES_PER_SCENE);
        if (allResolved && locked.sceneMediaIds.filter(Boolean).length === 0) {
          await finishWithKeyFrame(taskId, locked, 'aucune scène obtenable (source d\'images publiques saturée)');
        }
      } else {
        await logEvent(taskId, {
          step: `scene-${nextIdx}`,
          label: `Source momentanément saturée (essai ${locked.tries[nextIdx]}/${MAX_TRIES_PER_SCENE}) — je réessaie à la prochaine vérification.`,
          status: 'warning',
        });
      }
      return;
    }
  }

  // 2) Toutes les scènes prêtes → ASSEMBLAGE du MP4 réel.
  await logEvent(taskId, {
    step: 'assembler',
    label: 'J\'assemble vos scènes en MP4 : mouvement de caméra, fondus, encodage H.264 local.',
    status: 'running',
  });
  try {
    const framesBase64: string[] = [];
    for (const mediaId of locked.sceneMediaIds) {
      if (!mediaId) continue;
      const file = await db.paul_MediaFile.findUnique({ where: { id: mediaId } });
      if (file) framesBase64.push(Buffer.from(file.data).toString('base64'));
    }
    if (framesBase64.length < 2) throw new Error('scènes stockées insuffisantes pour l\'assemblage');
    const video = await internalVideo({
      prompt: locked.scenarioPrompt,
      scenes: framesBase64.length,
      size: '1280x720',
      secondsPerScene: 3,
      timeoutMs: 44000,
      precomputedFrames: framesBase64,
    });
    const check = verifyMp4(video.mp4);
    if (!check.ok) throw new Error('MP4 non conforme : ' + check.checks.filter((c) => !c.ok).map((c) => c.name).join(', '));
    const stored = await saveMediaFromBase64(video.mp4.toString('base64'), 'video');
    if (!stored?.url) throw new Error('enregistrement de la vidéo impossible');
    locked.done = true;
    await saveState(locked);
    await logEvent(taskId, {
      step: 'assembler',
      label: `MP4 assemblé et vérifié : ${video.totalSeconds}s, ${framesBase64.length} scènes réelles.`,
      status: 'done',
    });
    await logEvent(taskId, {
      step: 'livrer',
      label: 'Votre vidéo est prête : le fichier est livré ci-dessous.',
      status: 'done',
      detail: stored.url,
    });
    await db.paul_Task.update({ where: { id: taskId }, data: { progress: 100 } });
    await finishTask(taskId, {
      status: 'succeeded',
      result: stored.url,
      summary: locked.description,
      providerDetails: { providers: ['moteur interne'], agents: [], errors: [] },
    });
  } catch (e) {
    await logEvent(taskId, {
      step: 'assembler',
      label: `Assemblage différé : ${(e as Error).message.slice(0, 140)} — nouvel essai à la prochaine vérification.`,
      status: 'warning',
    });
    await finishWithKeyFrame(taskId, locked, `assemblage impossible (${(e as Error).message.slice(0, 80)})`);
  }
}

/** Échec propre : IMAGE CLÉ réelle du scénario (jamais de vidéo vide). */
async function finishWithKeyFrame(taskId: string, state: VideoStepState, cause: string): Promise<void> {
  let base64 = await generateImage(`${state.scenarioPrompt}, cinematic key frame, highly detailed`, '1280x720').catch(() => null);
  let engine = "moteur image d'appui";
  if (!base64) {
    const alt = await internalImage(`${state.scenarioPrompt}, cinematic key frame, highly detailed`, '1280x720', 15000).catch(() => null);
    if (alt) { base64 = alt.base64; engine = 'moteur image ouvert'; }
  }
  if (base64) {
    const stored = await saveMediaFromBase64(base64, 'image');
    if (stored?.url) {
      await logEvent(taskId, {
        step: 'livrer',
        label: `Vidéo complète impossible (${cause}) — voici l'IMAGE CLÉ réelle de votre scénario, produite par le ${engine}.`,
        status: 'warning',
        detail: stored.url,
      });
      await finishTask(taskId, {
        status: 'partial',
        result: stored.url,
        summary: `${state.description} — la vidéo complète n'a pas pu être assemblée cette fois (${cause}) ; aucune vidéo sans contenu réel ne vous est livrée. Réessayez dans quelques instants.`,
        providerDetails: { providers: [engine], agents: [], errors: [cause] },
      });
      return;
    }
  }
  await finishTask(taskId, {
    status: 'failed',
    result: '',
    summary: `${state.description} — ni la vidéo ni l'image clé n'ont pu être produites cette fois (${cause}). Aucun fichier vous est livré : réessayez dans quelques instants.`,
    providerDetails: { providers: ['moteur interne'], agents: [], errors: [cause] },
  });
}
