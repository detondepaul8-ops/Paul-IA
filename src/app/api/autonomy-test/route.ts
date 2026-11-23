/**
 * TEST D'AUTONOMIE DU MOTEUR INTERNE PAUL IA
 * GET /api/autonomy-test
 *
 * Désactive temporairement Z AI et GROQ AI (variables vidées pour l'invocation
 * — isolation serverless par invocation, aucun impact sur les autres requêtes)
 * puis vérifie que Paul IA peut toujours :
 *   1. générer une image de qualité professionnelle
 *   2. produire une véritable vidéo (MP4 H.264)
 *   3. créer un fichier Excel réel
 *   4. développer une petite application vérifiée
 * (+ bonus : Word, PDF, exécution restreinte, cerveau interne)
 *
 * Verdict honnête basé sur des vérifications réelles (ré-ouverture des
 * fichiers, signatures binaires, exécution de la logique applicative).
 */
import { NextResponse } from 'next/server';
import { runAutonomyTest } from '@/lib/autonomy';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const disableExternal = params.get('keepExternal') !== '1';
  const includeBonus = params.get('bonus') === '1';
  const started = Date.now();
  try {
    const report = await runAutonomyTest(disableExternal, includeBonus);
    return NextResponse.json({ ...report, wallClockMs: Date.now() - started });
  } catch (error) {
    return NextResponse.json(
      {
        verdict: 'ÉCHEC',
        error: error instanceof Error ? error.message : String(error),
        wallClockMs: Date.now() - started,
      },
      { status: 500 }
    );
  }
}
