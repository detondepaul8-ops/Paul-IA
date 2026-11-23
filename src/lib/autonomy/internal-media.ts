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

// ── Image ──────────────────────────────────────────────────────────────────

export interface GeneratedImage {
  base64: string;
  engine: string;
}

/** Image de qualité professionnelle sans clé ni crédit (modèle ouvert Flux). */
export async function internalImage(prompt: string, size = '1280x720', timeoutMs = 45000): Promise<GeneratedImage> {
  const [w, h] = size.split('x').map((n) => parseInt(n, 10) || 1024);
  const seed = Math.floor(Math.random() * 1_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}` +
    `&nologo=true&model=flux&seed=${seed}&referrer=paul-ia`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`moteur image interne HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error('image interne trop petite / vide');
  return { base64: buf.toString('base64'), engine: `flux-open(${w}x${h}, seed ${seed})` };
}

// ── Vidéo (MP4 réel) ───────────────────────────────────────────────────────

export interface InternalVideoOptions {
  prompt: string;
  /** Image source (base64 sans en-tête) pour le mode image → vidéo. */
  imageBase64?: string;
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
      // Mode texte → vidéo : keyframes parallèles du moteur interne.
      const prompts = scenePrompts(opts.prompt, scenes);
      const results = await Promise.allSettled(
        prompts.map((p) => internalImage(p, `${w}x${h}`, Math.max(15000, budget - (Date.now() - started) - 14000)))
      );
      const okFrames = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<GeneratedImage>[];
      if (okFrames.length >= 2) {
        engines.push(`flux-open (${okFrames.length}/${scenes} keyframes)`);
        for (let i = 0; i < okFrames.length; i++) {
          const f = path.join(tmp, `f${i}.jpg`);
          await writeFile(f, Buffer.from(okFrames[i].value.base64, 'base64'));
          frames.push(f);
        }
      } else {
        // Repli intégral : frames calculées localement (sharp) — vidéo réelle.
        engines.push('frames locales sharp (repli intégral)');
        const local = await localFallbackFrames(opts.prompt, scenes, w, h, tmp);
        frames.push(...local);
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

/** Frames générées localement par sharp (aucun service distant). */
async function localFallbackFrames(prompt: string, scenes: number, w: number, h: number, tmp: string): Promise<string[]> {
  const sharp = (await import('sharp')).default;
  const colors = [
    ['#0f2027', '#2c5364'], ['#203a43', '#4ca1af'],
    ['#2c3e50', '#fd746c'], ['#141e30', '#243b55'],
  ];
  const files: string[] = [];
  for (let i = 0; i < scenes; i++) {
    const [c1, c2] = colors[i % colors.length];
    const label = escapeXml(prompt.slice(0, 64));
    const svg = Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
        </linearGradient></defs>
        <rect width="${w}" height="${h}" fill="url(#g)"/>
        <text x="${w / 2}" y="${h / 2 - 20}" text-anchor="middle" font-family="DejaVu Sans" font-size="${Math.round(w / 18)}" fill="#ffffff" opacity="0.92">${label}</text>
        <text x="${w / 2}" y="${h / 2 + 30}" text-anchor="middle" font-family="DejaVu Sans" font-size="${Math.round(w / 34)}" fill="#ffffff" opacity="0.7">Paul IA — moteur interne — scène ${i + 1}/${scenes}</text>
      </svg>`
    );
    const f = path.join(tmp, `l${i}.jpg`);
    await sharp(svg).jpeg({ quality: 88 }).toFile(f);
    files.push(f);
  }
  return files;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string)
  );
}
