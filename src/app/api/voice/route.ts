import { NextRequest, NextResponse } from 'next/server';

const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // ~12 Mo (≈ 5-10 min de dictée compressée)

// Dictées longues : l'ASR peut prendre >10 s sur un enregistrement de plusieurs minutes.
export const maxDuration = 60;

interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
  token?: string;
}

/**
 * ASR direct (sans SDK) — même contrat que zai.audio.asr.create du SDK :
 * POST {baseUrl}/audio/asr, Bearer apiKey, en-têtes X-Z-AI-*, corps { file_base64 }.
 * Composant transféré de CELTIIS BASSILA (route éprouvée en production) et adapté
 * à PAUL IA : assistant universel, aucune restriction de rôle.
 */
async function asrDirect(cfg: ZaiConfig, fileBase64: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cfg.apiKey}`,
    'X-Z-AI-From': 'Z',
  };
  if (cfg.chatId) headers['X-Chat-Id'] = cfg.chatId;
  if (cfg.userId) headers['X-User-Id'] = cfg.userId;
  if (cfg.token) headers['X-Token'] = cfg.token;

  const res = await fetch(`${cfg.baseUrl}/audio/asr`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ file_base64: fileBase64 }),
  });
  if (!res.ok) throw new Error(`ASR HTTP ${res.status}`);
  const data: any = await res.json();
  return String(data?.text || '');
}

/**
 * POST /api/voice — dictée micro : audio (webm/mp3/wav) → texte (ASR).
 * Le navigateur envoie un FormData { audio: File } ; la transcription revient en JSON.
 * Chaîne de secours à 4 canaux (transférée de CELTIIS BASSILA) :
 *  1) appel direct via ZAI_CONFIG_JSON ;
 *  2) SDK z-ai-web-dev-sdk (local) ;
 *  3) canal public api.z.ai (modèle glm-asr) ;
 *  4) canal Groq (whisper-large-v3, verrouillé sur le français).
 */
export async function POST(req: NextRequest) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Requête audio illisible' }, { status: 400 });
    }
    const file = form.get('audio');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier audio manquant' }, { status: 400 });
    }
    if (file.size === 0) return NextResponse.json({ error: 'Audio vide' }, { status: 400 });
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio trop long (max ~10 minutes)' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    // 1) Appel direct avec ZAI_CONFIG_JSON (config du serveur)
    let text = '';
    const rawCfg = process.env.ZAI_CONFIG_JSON;
    if (rawCfg) {
      try {
        const cfg = JSON.parse(rawCfg) as ZaiConfig;
        if (cfg.baseUrl && cfg.apiKey) text = (await asrDirect(cfg, base64)).trim();
      } catch (e) {
        console.error('Paul IA voice (ASR direct) error:', e instanceof Error ? e.message : e);
      }
    }

    // 2) Repli SDK (fonctionne partout où un fichier .z-ai-config existe — local)
    if (!text) {
      try {
        const { default: ZAI } = await import('z-ai-web-dev-sdk');
        const zai = rawCfg ? new (ZAI as unknown as new (cfg: Record<string, string>) => { audio: { asr: { create: (a: any) => Promise<any> } } })(JSON.parse(rawCfg))
          : await ZAI.create();
        const result: any = await zai.audio.asr.create({ file_base64: base64 });
        text = String(result?.text || '').trim();
      } catch (e) {
        console.error('Paul IA voice (ASR SDK) error:', e instanceof Error ? e.message : e);
      }
    }

    // 3) Canal public api.z.ai : POST /audio/transcriptions, modèle glm-asr
    if (!text && process.env.ZAI_CONFIG_JSON) {
      try {
        const cfg = JSON.parse(rawCfg as string) as ZaiConfig;
        const pk = cfg.apiKey;
        if (pk) {
          const pubBase = (process.env.ZAI_PUBLIC_BASE_URL || 'https://api.z.ai/api/paas/v4').replace(/\/chat\/completions$/, '');
          const fd = new FormData();
          fd.append('model', process.env.ZAI_ASR_MODEL || 'glm-asr-2512');
          fd.append('file', new Blob([new Uint8Array(buffer)], { type: file.type || 'audio/wav' }), 'audio.wav');
          fd.append('stream', 'false');
          const res = await fetch(`${pubBase}/audio/transcriptions`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${pk}` },
            body: fd,
          });
          if (res.ok) {
            const d: any = await res.json();
            text = String(d?.text || '').trim();
          } else {
            console.error('Paul IA voice (ASR public) HTTP', res.status);
          }
        }
      } catch (e) {
        console.error('Paul IA voice (ASR public) error:', e instanceof Error ? e.message : e);
      }
    }

    // 4) Canal Groq (API compatible OpenAI, whisper-large-v3, français) —
    //    Groq déduit le format audio de l'extension du nom de fichier : obligatoire.
    if (!text && process.env.GROQ_API_KEY) {
      try {
        const mime = (file.type || 'audio/wav').toLowerCase();
        const ext = mime.includes('webm') ? 'webm'
          : mime.includes('ogg') ? 'ogg'
            : mime.includes('mpeg') || mime.includes('mp3') ? 'mp3'
              : mime.includes('mp4') || mime.includes('m4a') ? 'm4a'
                : mime.includes('flac') ? 'flac'
                  : 'wav';
        const gd = new FormData();
        gd.append('model', process.env.GROQ_MODEL || 'whisper-large-v3');
        gd.append('language', 'fr');
        gd.append('response_format', 'json');
        gd.append('file', new Blob([new Uint8Array(buffer)], { type: mime }), `audio.${ext}`);
        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
          body: gd,
        });
        if (res.ok) {
          const d: any = await res.json();
          text = String(d?.text || '').trim();
        } else {
          console.error('Paul IA voice (ASR Groq) HTTP', res.status);
        }
      } catch (e) {
        console.error('Paul IA voice (ASR Groq) error:', e instanceof Error ? e.message : e);
      }
    }

    if (!text) {
      return NextResponse.json({ error: 'Transcription impossible pour le moment' }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Paul IA voice (ASR) error:', error);
    return NextResponse.json({ error: 'Transcription impossible pour le moment' }, { status: 500 });
  }
}
