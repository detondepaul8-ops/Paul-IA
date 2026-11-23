// ── Bootstrap idempotent : crée les tables du suivi si absentes. ────────
// CREATE TABLE IF NOT EXISTS uniquement : aucune table existante n'est
// jamais modifiée ou supprimée (les tables paul_* et les tables d'autres
// applications cohabitent sur cette base — il est interdit de les toucher).
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DDL = [
  `CREATE TABLE IF NOT EXISTS "paul_tasks" (
    "id" TEXT PRIMARY KEY,
    "conversation_id" TEXT,
    "module" TEXT NOT NULL DEFAULT 'agents',
    "title" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "plan" JSONB NOT NULL DEFAULT '[]',
    "result" TEXT,
    "summary" TEXT,
    "providerDetails" JSONB,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "paul_tasks_status_idx" ON "paul_tasks"("status")`,
  `CREATE INDEX IF NOT EXISTS "paul_tasks_created_idx" ON "paul_tasks"("created_at")`,
  `CREATE TABLE IF NOT EXISTS "paul_events" (
    "id" TEXT PRIMARY KEY,
    "task_id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'done',
    "detail" TEXT,
    "agent_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "paul_events_task_idx" ON "paul_events"("task_id", "created_at")`,
];

export async function GET() {
  try {
    for (const stmt of DDL) await db.$executeRawUnsafe(stmt);
    const probe = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "paul_tasks"`);
    return NextResponse.json({
      ok: true,
      tables: ['paul_tasks', 'paul_events'],
      probe,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
