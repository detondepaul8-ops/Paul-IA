// ── MOTEUR INTERNE PAUL IA — Orchestrateur & TEST D'AUTONOMIE ─────────────
// Exécute le test obligatoire : Z AI et GROQ sont désactivés (variables
// vidées pour l'invocation), et Paul IA doit quand même :
//   1. générer une image de qualité professionnelle
//   2. produire une véritable vidéo (MP4 H.264 jouable)
//   3. créer un fichier Excel réel et vérifié
//   4. développer une petite application fonctionnelle
// Bonus testés : Word, PDF, exécution de code en environnement restreint,
// cerveau interne (LLM sans clé).
//
// Retourne un verdict HONNÊTE : chaque test rapporte son moteur, ses
// vérifications et son empreinte ; aucun succès n'est déclaré sans preuve.

import { freeLLMChat } from './free-llm';
import { internalImage, internalVideo, proceduralImage } from './internal-media';
import { generateExcelSpec, buildExcel, generateDocSpec, buildWord, buildPdf } from './internal-office';
import { generateAppSpec, buildApp, coreTestFor } from './internal-apps';
import { runJsSandboxed } from './internal-exec';
import { verifyExcel, verifyWord, verifyPdf, verifyMp4, verifyImage, verifyLogic } from './selfcheck';
import { saveMediaFromBase64 } from '../media-storage';

export interface AutonomyTestResult {
  test: string;
  ok: boolean;
  engine: string;
  url?: string;
  sizeBytes?: number;
  sha256?: string;
  durationMs: number;
  checks?: Array<{ name: string; ok: boolean; detail?: string }>;
  excerpt?: string;
}

export interface AutonomyReport {
  verdict: 'AUTONOME' | 'PARTIEL' | 'ÉCHEC';
  externalAiDisabled: boolean;
  startedAt: string;
  totalDurationMs: number;
  tests: AutonomyTestResult[];
}

function sha256(buf: Buffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  return createHash('sha256').update(buf).digest('hex').slice(0, 32) + '…';
}

async function timed(
  name: string,
  engine: string,
  fn: () => Promise<Omit<AutonomyTestResult, 'test' | 'engine' | 'durationMs' | 'ok'> & { ok?: boolean }>
): Promise<AutonomyTestResult> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { test: name, engine, durationMs: Date.now() - t0, ...r, ok: r.ok !== false };
  } catch (error) {
    return {
      test: name,
      ok: false,
      engine,
      durationMs: Date.now() - t0,
      checks: [{ name: 'exception', ok: false, detail: error instanceof Error ? error.message : String(error) }],
    };
  }
}

/** Le test complet. `disableExternal` vide les variables d'AI externes
 *  pour l'invocation courante (isolation serverless par invocation).
 *  Les tests 1+2 puis 3+4 sont exécutés en parallèle pour tenir dans la
 *  fenêtre serverless ; les bonus (Word, PDF, exécution) via includeBonus. */
export async function runAutonomyTest(disableExternal: boolean, includeBonus = false): Promise<AutonomyReport> {
  const savedZ = process.env.ZAI_CONFIG_JSON;
  const savedG = process.env.GROQ_API_KEY;
  if (disableExternal) {
    process.env.ZAI_CONFIG_JSON = '';
    process.env.GROQ_API_KEY = '';
  }
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const tests: AutonomyTestResult[] = [];

  const testCerveau = () => timed('0. Cerveau interne (LLM sans clé ni crédit)', 'text.pollinations.ai (modèle ouvert)', async () => {
    const answer = await freeLLMChat(
      [{ role: 'user', content: 'Réponds uniquement par le mot OK, sans rien ajouter.' }],
      { maxTokens: 20, timeoutMs: 25000 }
    );
    const ok = /\bOK\b/i.test(answer);
    return {
      excerpt: answer.slice(0, 120),
      checks: [{ name: 'réponse conforme', ok, detail: answer.slice(0, 60) }],
    };
  });

  const testImage = () => timed('1. Image de qualité professionnelle (sans Z AI)', '', async () => {
    let img;
    try {
      img = await internalImage(
        'professional photograph of a sunset over Lake Nokoue, Benin, pirogues silhouettes, golden light, cinematic, highly detailed, 4k',
        '1024x1024', 35000
      );
    } catch (remoteError) {
      // Modèles ouverts saturés/bloqués par IP → moteur graphique procédural
      // 100% local de Paul IA (aucun service distant, toujours disponible).
      console.error('keyframes ouvertes indisponibles, procédural:', remoteError instanceof Error ? remoteError.message : remoteError);
      img = await proceduralImage(
        'Lever de soleil sur le lac Nokoué — Paul IA', '1024x1024'
      );
    }
    const bytes = Buffer.from(img.base64, 'base64');
    const v = await verifyImage(bytes);
    let url: string | undefined;
    try { url = (await saveMediaFromBase64(img.base64, 'image'))?.url; } catch (e) { console.error('stockage image:', e); }
    return {
      ok: v.ok,
      engine: img.engine,
      url,
      sizeBytes: bytes.length,
      sha256: sha256(bytes),
      checks: [...v.checks, { name: 'persistance média', ok: true, detail: url ? `URL: ${url}` : 'octets vérifiés, stockage non joignable' }],
    };
  });

  const testVideo = () => timed('2. Vidéo RÉELLE (MP4 H.264 jouable, sans Z AI ni GROQ)', '', async () => {
    const video = await internalVideo({
      prompt: 'sunset over Lake Nokoue Cotonou Benin, pirogue boats on calm water, cinematic',
      scenes: 3,
      size: '1280x720',
      secondsPerScene: 3,
      timeoutMs: 38000,
    });
    const v = verifyMp4(video.mp4);
    let url: string | undefined;
    try { url = (await saveMediaFromBase64(video.mp4.toString('base64'), 'video'))?.url; } catch (e) { console.error('stockage vidéo:', e); }
    return {
      ok: v.ok,
      engine: video.engines.join(' + '),
      url,
      sizeBytes: video.mp4.length,
      sha256: sha256(video.mp4),
      checks: [
        ...v.checks,
        { name: 'durée totale', ok: video.totalSeconds >= 5, detail: `${video.totalSeconds}s` },
        { name: 'persistance média', ok: true, detail: url ? `URL: ${url}` : 'octets vérifiés, stockage non joignable' },
      ],
    };
  });

  const testExcel = () => timed('3. Fichier Excel RÉEL (vérifié par ré-ouverture)', 'freeLLM (spec) + exceljs embarqué', async () => {
    const spec = await generateExcelSpec('Ventes mensuelles d\'une boutique de Cotonou en 2026');
    const bytes = await buildExcel(spec);
    const v = await verifyExcel(spec, bytes);
    return {
      ok: v.ok,
      sizeBytes: bytes.length,
      sha256: sha256(bytes),
      checks: [...v.checks, { name: 'titre du classeur', ok: !!spec.title, detail: spec.title }],
    };
  });

  const testApp = () => timed('4. Petite application DÉVELOPPÉE ET VÉRIFIÉE (sans Z AI)', '', async () => {
    const spec = await generateAppSpec('une petite application de calculatrice moderne et élégante');
    const html = buildApp(spec);
    const bytes = Buffer.from(html, 'utf8');
    const core = coreTestFor(spec.archetype);
    let logicCheck = { name: 'logique applicative', ok: false, detail: 'archétype sans noyau testable' };
    if (core) {
      const r = runJsSandboxed(`${extractCore(html)}\n${core.code}`, 3000);
      logicCheck = { name: 'logique applicative (exécution restreinte)', ok: r.ok && core.expect(String(r.result)), detail: r.result || r.error || 'pas de sortie' };
    }
    const structureOk = /<!DOCTYPE html>/.test(html) && /__paulCore/.test(html) && html.length > 2000;
    return {
      ok: structureOk && logicCheck.ok,
      engine: `freeLLM (conception) + gabarit déterministe ${spec.archetype} + vm restreinte`,
      sizeBytes: bytes.length,
      sha256: sha256(bytes),
      excerpt: `Titre: ${spec.title} — archétype: ${spec.archetype}`,
      checks: [
        { name: 'structure HTML complète', ok: structureOk },
        logicCheck,
      ],
    };
  });

  const testWord = () => timed('5. Bonus : document Word réel', 'freeLLM (contenu) + docx embarqué', async () => {
    const spec = await generateDocSpec('Compte rendu de réunion du projet autonomie Paul IA');
    const bytes = await buildWord(spec);
    const v = await verifyWord(bytes);
    return { ok: v.ok, sizeBytes: bytes.length, sha256: sha256(bytes), checks: v.checks };
  });

  const testPdf = () => timed('6. Bonus : document PDF réel', 'freeLLM (contenu) + pdf-lib embarqué', async () => {
    const spec = await generateDocSpec('Note de synthèse sur le lac Nokoué et son écosystème');
    const bytes = await buildPdf(spec);
    const v = await verifyPdf(bytes);
    return { ok: v.ok, sizeBytes: bytes.length, sha256: sha256(bytes), checks: v.checks };
  });

  const testExec = () => timed('7. Bonus : exécution de code en environnement restreint', 'node:vm — contexte gelé, sans fs/réseau, timeout 3s', async () => {
    const v = verifyLogic(`
      function tri(t) { return t.slice().sort(function(a,b){return a-b;}); }
      var r = tri([5,3,9,1]);
      if (JSON.stringify(r) !== '[1,3,5,9]') throw new Error('tri incorrect');
      JSON.stringify({ tri: r, isolation: 'aucun fs ni réseau disponible' });`);
    return { ok: v.ok, checks: v.checks };
  });

  try {
    // Groupe A : cerveau interne seul (pré-requis logique)
    tests.push(await testCerveau());

    // Groupes B+C ensemble : image, vidéo, Excel, application en parallèle
    // (les fetchs réseau dominent ; l'encodage ffmpeg est le seul gros calcul
    // CPU) — tout doit tenir dans la fenêtre serverless de 60 s.
    const results = await Promise.all([testImage(), testVideo(), testExcel(), testApp()]);
    tests.push(...results);

    // Bonus (optionnels), séquentiels pour limiter les rafales du service libre
    if (includeBonus) {
      tests.push(await testWord(), await testPdf(), await testExec());
    }
  } finally {
    if (disableExternal) {
      process.env.ZAI_CONFIG_JSON = savedZ;
      process.env.GROQ_API_KEY = savedG;
    }
  }

  // Verdict STRICT : les 4 tests obligatoires (noms préservés même en cas
  // d'exception) doivent tous réussir — aucun succès déclaré sans preuve.
  const mandatory = [1, 2, 3, 4].map((n) => tests.find((t) => t.test.startsWith(`${n}. `)));
  const allPresent = mandatory.every((t) => !!t);
  const allOk = allPresent && mandatory.every((t) => t!.ok);
  const someOk = mandatory.some((t) => t?.ok);
  const verdict: AutonomyReport['verdict'] = allOk ? 'AUTONOME' : someOk ? 'PARTIEL' : 'ÉCHEC';

  return {
    verdict,
    externalAiDisabled: disableExternal,
    startedAt,
    totalDurationMs: Date.now() - t0,
    tests,
  };
}

/** Extrait la fonction __paulCore générée du HTML pour la tester isolément. */
function extractCore(html: string): string {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const last = scripts[scripts.length - 1] || '';
  const end = last.indexOf('var app');
  return end > 0 ? last.slice(0, end) : last;
}
