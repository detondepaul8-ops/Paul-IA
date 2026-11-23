// ── Vue d'une tâche : état, événements temps réel, compte rendu. ────────
// Version client : ne contient AUCUN détail fournisseur (identité unique).
// Chaque consultation FAIT AVANCER les tâches vidéo par étapes : une scène
// réelle est peinte ou le MP4 assemblé, puis l'état à jour est renvoyé.
import { NextRequest, NextResponse } from 'next/server';
import { getTaskView } from '@/lib/monitor';
import { advanceVideoSteps } from '@/lib/video-steps';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    try {
      await advanceVideoSteps(id);
    } catch (stepError) {
      console.error('Avance vidéo par étapes:', (stepError as Error).message);
    }
    const view = await getTaskView(id);
    if (!view) return NextResponse.json({ error: 'Tâche inconnue' }, { status: 404 });
    return NextResponse.json(view);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
