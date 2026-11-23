// ── Vue d'une tâche : état, événements temps réel, compte rendu. ────────
// Version client : ne contient AUCUN détail fournisseur (identité unique).
import { NextRequest, NextResponse } from 'next/server';
import { getTaskView } from '@/lib/monitor';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const view = await getTaskView(id);
    if (!view) return NextResponse.json({ error: 'Tâche inconnue' }, { status: 404 });
    return NextResponse.json(view);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
