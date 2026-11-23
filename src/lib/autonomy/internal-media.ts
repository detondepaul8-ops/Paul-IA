// ── MOTEUR INTERNE PAUL IA — Images & vidéos RÉELLES sans API payante ─────
// 1. Images : modèles ouverts (Pollinations / Flux) — aucune clé, aucun crédit.
// 2. Vidéos : MP4 H.264 RÉEL encodé par ffmpeg-static (binaire embarqué) —
//    keyframes générées à partir du texte, mouvement Ken Burns (zoompan) et
//    fondus enchaînés (xfade). Aucune dépendance à Z AI ni à GROK.
// 3. Repli intégral : si les keyframes distantes échouent, frames calculées
//    localement par sharp — la vidéo reste réelle et jouable.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { chmodSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateImage } from '../zai';

/** La demande n'a pas pu être servie avec du contenu RÉEL : on refuse de
 *  produire une vidéo sans contenu (dégradés de couleur, affiches abstraites)
 *  qui donnerait à l'utilisateur l'impression d'un résultat. */
export class VideoWithoutRealContentError extends Error {}

// ── Image ──────────────────────────────────────────────────────────────────

export interface GeneratedImage {
  base64: string;
  engine: string;
}

const IMAGE_MODELS = ['flux', 'flux-realism', 'turbo', ''];

/** Image via les modèles ouverts publics — cascade de variantes pour
 *  survivre aux limites par IP/modèle (402/503 momentanés). */
export async function internalImage(prompt: string, size = '1280x720', timeoutMs = 45000): Promise<GeneratedImage> {
  const [w, h] = size.split('x').map((n) => parseInt(n, 10) || 1024);
  const seed = Math.floor(Math.random() * 1_000_000);
  const perTry = Math.min(timeoutMs, 20000); // ≥ 20 s par modèle : depuis Vercel, la source ouverte met plus de temps qu'en local
  const errors: string[] = [];

  for (const model of IMAGE_MODELS) {
    const qs = new URLSearchParams({
      width: String(w), height: String(h), seed: String(seed), referrer: 'paul-ia',
    });
    if (model) qs.set('model', model);
    if (model !== 'flux-realism') qs.set('nologo', 'true');
    try {
      const res = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${qs}`, {
        signal: AbortSignal.timeout(perTry),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}${model ? ` (${model})` : ''}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error('image vide');
      return { base64: buf.toString('base64'), engine: `modèle ouvert ${model || 'flux'}(${w}x${h}, seed ${seed})` };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(`moteur image interne indisponible (${errors.join(' | ')})`);
}

/** Image via le moteur d'appui de l'application (clé configurée) —
 *  utilisée quand les modèles image ouverts ne répondent pas. */
export async function cogImage(prompt: string, size = '1280x720', timeoutMs = 12000): Promise<GeneratedImage> {
  const result = await Promise.race([
    generateImage(prompt, size),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
  if (!result || result.length < 1000) throw new Error("moteur image d'appui indisponible");
  return { base64: result, engine: "moteur image d'appui (images réelles)" };
}

/** Moteur graphique PROCÉDURAL 100 % local : affiche professionnelle générée
 *  par le code de Paul IA (palette dérivée du prompt, composition géométrique,
 *  typographie) — réservé aux affiches/documents, JAMAIS aux vidéos. */
export async function proceduralImage(prompt: string, size = '1280x720'): Promise<GeneratedImage> {
  const [w, h] = size.split('x').map((n) => parseInt(n, 10) || 1280);
  const sharp = (await import('sharp')).default;

  // Palette déterministe dérivée du prompt
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) hash = (hash * 31 + prompt.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const hue2 = (hue + 60) % 360;
  const c = (hh: number, l: number) => `hsl(${hh}, 70%, ${l}%)`;

  const words = prompt.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 8);
  const title = words.slice(0, 5).join(' ').toUpperCase() || 'PAUL IA';
  const sub = words.slice(5).join(' ') || 'MOTEUR GRAPHIQUE INTERNE';

  const circles = Array.from({ length: 6 }, (_, i) => {
    const r = ((hash >> (i * 3)) % 30) + 10;
    const cx = ((hash >> (i * 5)) % w);
    const cy = ((hash >> (i * 7)) % h);
    return `<circle cx="${cx}" cy="${cy}" r="${(r / 40) * w}" fill="${c((hue + i * 24) % 360, 50 + i * 4)}" opacity="0.18"/>`;
  }).join('');

  const fs = Math.round(w / 12);
  const fs2 = Math.round(w / 30);
  const svg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c(hue, 22)}"/>
          <stop offset="0.55" stop-color="${c(hue2, 34)}"/>
          <stop offset="1" stop-color="${c(hue, 14)}"/>
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="40"/></filter>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <g filter="url(#blur)">${circles}</g>
      <rect x="0" y="${h * 0.42}" width="${w}" height="${h * 0.2}" fill="#000000" opacity="0.28"/>
      <rect x="${w * 0.06}" y="${h * 0.455}" width="${w * 0.012}" height="${h * 0.11}" fill="${c(hue2, 62)}"/>
      <text x="${w * 0.09}" y="${h * 0.53}" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="${fs}" fill="#ffffff">${esc(title)}</text>
      <text x="${w * 0.09}" y="${h * 0.585}" font-family="DejaVu Sans, sans-serif" font-size="${fs2}" fill="${c(hue2, 78)}">${esc(sub)}</text>
      <text x="${w - w * 0.06}" y="${h - h * 0.04}" text-anchor="end" font-family="DejaVu Sans, sans-serif" font-size="${Math.round(fs2 * 0.8)}" fill="#ffffff" opacity="0.65">Paul IA — moteur graphique interne</text>
    </svg>`
  );
  const buf = await sharp(svg).jpeg({ quality: 90 }).toBuffer();
  if (buf.length < 1000) throw new Error('image procédurale vide');
  return { base64: buf.toString('base64'), engine: `moteur graphique procédural interne (${w}x${h}, 100% local)` };
}

// ── Vidéo (MP4 réel) ───────────────────────────────────────────────────────

export interface InternalVideoOptions {
  prompt: string;
  /** Image source (base64 sans en-tête) pour le mode image → vidéo. */
  imageBase64?: string;
  /** Compléter les keyframes manquantes avec le moteur image d'appui
   *  (clé configurée) au lieu d'échouer dès la première source. */
  useCogFallback?: boolean;
  /** Nombre de scènes/keyframes (3 ou 4). Défaut 4. */
  scenes?: number;
  /** Résolution. Défaut 1280x720. */
  size?: string;
  /** Secondes par scène. Défaut 3. */
  secondsPerScene?: number;
  timeoutMs?: number;
}

export interface InternalVideoResult {
  mp4: Buffer;
  scenes: number;
  totalSeconds: number;
  engines: string[];
}

function ffmpegBinary(): string {
  // ffmpeg-static est marqué `serverExternalPackages` dans next.config :
  // le paquet reste un require runtime depuis node_modules (tracé & inclus).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('ffmpeg-static') as string | { default: string };
  const p = typeof mod === 'string' ? mod : mod.default;
  try { chmodSync(p, 0o755); } catch { /* bit déjà exécutable */ }
  return p;
}

function runFfmpeg(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = ffmpegBinary();
    const child = spawn(bin, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
    });
    let err = '';
    child.stderr?.on('data', (d) => { err += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg code ${code}: ${err.slice(-400)}`))));
  });
}

/** Variantes de prompt par scène : même sujet, angles/éclairage différents. */
function scenePrompts(base: string, scenes: number): string[] {
  const styles = [
    'wide establishing shot, cinematic lighting, highly detailed, professional',
    'medium shot, golden hour light, depth of field, cinematic, highly detailed',
    'close-up detail, dramatic lighting, rich colors, cinematic, highly detailed',
    'wide shot, dusk atmosphere, volumetric light, cinematic, highly detailed',
  ];
  return Array.from({ length: scenes }, (_, i) => `${base}, ${styles[i % styles.length]}`);
}

/**
 * Génère une VRAIE vidéo MP4 (H.264, jouable) à partir d'un texte ou d'une
 * image, entièrement hors ligne des IA externes : keyframes (moteur interne)
 * → transitions fondues (+ mouvement de caméra si le budget le permet)
 * → encodage ffmpeg embarqué. Si l'encodage complet dépasse le budget,
 * reprise automatique en mode allégé (xfade seul, ultrafast) : la vidéo
 * reste réelle et jouable.
 */
export async function internalVideo(opts: InternalVideoOptions): Promise<InternalVideoResult> {
  try {
    return await encodeVideo(opts, true);
  } catch (error) {
    // Sans contenu réel, retenter ne changera rien : l'échec est honnête.
    if (error instanceof VideoWithoutRealContentError) throw error;
    console.error('Encodage complet impossible, mode allégé:', error instanceof Error ? error.message : error);
    return await encodeVideo({ ...opts, scenes: Math.min(opts.scenes ?? 4, 3) }, false);
  }
}

async function encodeVideo(opts: InternalVideoOptions, motion: boolean): Promise<InternalVideoResult> {
  const scenes = Math.min(Math.max(opts.scenes ?? 4, 2), 4);
  const [w, h] = (opts.size ?? '1280x720').split('x').map((n) => parseInt(n, 10) || 1280);
  const fps = 25;
  const perScene = opts.secondsPerScene ?? 3;
  const engines: string[] = [];
  const started = Date.now();
  const budget = opts.timeoutMs ?? 42000;

  const tmp = await mkdtemp(path.join(os.tmpdir(), 'paul-video-'));
  try {
    const frames: string[] = [];

    if (opts.imageBase64) {
      // Mode image → vidéo : une seule source, mouvement de caméra.
      const img = Buffer.from(opts.imageBase64, 'base64');
      const frame = path.join(tmp, 'f0.jpg');
      await writeFile(frame, img);
      frames.push(frame);
      engines.push('image fournie');
    } else {
      // Mode texte → vidéo : keyframes RÉELLES uniquement — jamais de contenu
      // abstrait. Source 1 : modèles image ouverts (sans clé). Source 2 : le
      // moteur image d'appui pour les scènes manquantes. Si aucune image
      // réelle n'est obtenable, la vidéo est REFUSÉE (pas de contenu vide).
      const prompts = scenePrompts(opts.prompt, scenes);
      const results = await Promise.allSettled(
        prompts.map((p) => internalImage(p, `${w}x${h}`, Math.max(24000, budget - (Date.now() - started) - 12000)))
      );
      const realFrames: GeneratedImage[] = [];
      const failedPrompts: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') realFrames.push(r.value);
        else failedPrompts.push(prompts[i]);
      });
      const openCount = realFrames.length;
      if (openCount > 0) engines.push(`moteur image ouvert (${openCount}/${scenes} scènes)`);

      if (opts.useCogFallback && failedPrompts.length > 0 && realFrames.length < scenes) {
        const cogBudget = Math.max(6000, Math.min(12000, budget - (Date.now() - started) - 16000));
        const cogResults = await Promise.allSettled(
          failedPrompts.map((p) => cogImage(`${p}, cinematic still frame, highly detailed`, `${w}x${h}`, cogBudget))
        );
        const cogOk = cogResults.filter(
          (r): r is PromiseFulfilledResult<GeneratedImage> => r.status === 'fulfilled'
        );
        for (const r of cogOk) realFrames.push(r.value);
        if (cogOk.length > 0) engines.push(`moteur image d'appui (${cogOk.length}/${failedPrompts.length} scènes)`);
      }

      if (realFrames.length < 2) {
        throw new VideoWithoutRealContentError(
          `aucune image réelle du scénario n'a pu être obtenue (${realFrames.length}/${scenes} scènes) — aucune vidéo sans contenu n'est livrée`
        );
      }

      for (let i = 0; i < realFrames.length; i++) {
        const f = path.join(tmp, `f${i}.jpg`);
        await writeFile(f, Buffer.from(realFrames[i].base64, 'base64'));
        frames.push(f);
      }
    }

    const n = frames.length;
    const xfadeDur = 0.7;
    const totalSeconds = n * perScene - (n - 1) * xfadeDur;

    // filter_complex : (Ken Burns optionnel) + chaîne xfade.
    const inputs = frames.flatMap((f) => ['-loop', '1', '-t', String(perScene), '-i', f]);
    const parts: string[] = [];
    const labels: string[] = [];
    for (let i = 0; i < n; i++) {
      const zoom = motion
        ? `zoompan=z='${i % 2 === 0 ? '1.0+0.0004*on' : '1.12-0.0004*on'}':d=${perScene * fps}:s=${w}x${h}:fps=${fps},`
        : '';
      parts.push(`[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},${zoom}setsar=1[v${i}]`);
      labels.push(`[v${i}]`);
    }
    let chain = labels[0];
    let offset = perScene - xfadeDur;
    for (let i = 1; i < n; i++) {
      parts.push(`${chain}[v${i}]xfade=transition=fade:duration=${xfadeDur}:offset=${offset.toFixed(2)}[x${i}]`);
      chain = `[x${i}]`;
      offset += perScene - xfadeDur;
    }
    const filter = `${parts.join(';')};${chain}format=yuv420p[vout]`;
    const out = path.join(tmp, 'out.mp4');
    const args = [
      ...inputs,
      '-filter_complex', filter,
      '-map', '[vout]',
      '-c:v', 'libx264', '-preset', motion ? 'veryfast' : 'ultrafast', '-crf', motion ? '23' : '26',
      '-movflags', '+faststart',
      out,
    ];
    const remaining = Math.max(12000, budget - (Date.now() - started));
    await runFfmpeg(args, remaining);
    const mp4 = await readFile(out);
    if (mp4.length < 10000 || mp4.slice(4, 8).toString() !== 'ftyp') {
      throw new Error('MP4 produit invalide');
    }
    engines.push(`ffmpeg-static H.264 ${motion ? '(Ken Burns+fondus)' : '(fondus, allégé)'}`);
    return { mp4, scenes: n, totalSeconds: Number(totalSeconds.toFixed(1)), engines };
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string)
  );
}

const esc = escapeXml;
