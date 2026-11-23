// ── Diagnostic réseau des sources d'images (mesures réelles depuis Vercel) ──
// GET /api/diag-network → statuts HTTP, latences et tailles réelles par modèle.
// Aucun secret affiché : uniquement des mesures de disponibilité.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const models = ['flux', 'turbo', ''];
  const results: Array<Record<string, unknown>> = [];
  for (const model of models) {
    const t0 = Date.now();
    const qs = new URLSearchParams({
      width: '1280',
      height: '720',
      seed: String(Math.floor(Math.random() * 1_000_000)),
      referrer: 'paul-ia',
      nologo: 'true',
    });
    if (model) qs.set('model', model);
    try {
      const res = await fetch(
        `https://image.pollinations.ai/prompt/${encodeURIComponent('a colorful bird flying over a lush green forest')}?${qs}`,
        { signal: AbortSignal.timeout(12000) }
      );
      const buf = Buffer.from(await res.arrayBuffer());
      results.push({
        model: model || 'default',
        status: res.status,
        ms: Date.now() - t0,
        bytes: buf.length,
        ok: res.ok && buf.length > 1000,
      });
    } catch (e) {
      results.push({ model: model || 'default', ms: Date.now() - t0, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ at: new Date().toISOString(), results });
}
