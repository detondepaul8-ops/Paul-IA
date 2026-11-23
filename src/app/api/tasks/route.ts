// ── Tâches complexes : création + exécution par agents parallèles. ──────
// POST : PAUL IA présente le plan, mobilise les agents, journalise chaque
// étape réelle et livre la réponse consolidée + le compte rendu final.
// GET  : dernières tâches (aperçu client, sans détails techniques).
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { startAgentTask, executeAgentTask } from '@/lib/agents/orchestrator';
import { shouldOrchestrate } from '@/lib/monitor';
import { db } from '@/lib/db';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : undefined;
    if (!message) return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    if (!shouldOrchestrate(message) && body?.force !== true) {
      return NextResponse.json({
        error: 'Cette demande ne nécessite pas d\'agents parallèles. Adressez-la au chat, ou renvoyez force:true.',
      }, { status: 422 });
    }
    // Réponse immédiate : le client suit l'exécution en temps réel
    // (polling des événements) pendant que les agents travaillent.
    const { taskId, plan } = await startAgentTask({ message, conversationId });
    after(async () => {
      try {
        await executeAgentTask(taskId);
      } catch (e) {
        console.error('Agent task background error:', e);
      }
    });
    return NextResponse.json({ taskId, plan });
  } catch (error) {
    console.error('Task API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const tasks = await db.paul_Task.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, status: true, progress: true,
        module: true, createdAt: true, durationMs: true,
      },
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
