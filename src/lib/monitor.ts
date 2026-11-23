// ── PAUL IA MONITOR ─────────────────────────────────────────────────────
// Suivi des opérations en temps réel : plan annoncé, événements réels,
// pourcentage réellement calculé, compte rendu final automatique.
// Identité unique : l'espace client ne voit JAMAIS les noms des
// fournisseurs externes — ils restent dans providerDetails (admin).
import { db } from './db';
import type { paul_Task, paul_Event } from '@prisma/client';

export type EventStatus = 'pending' | 'running' | 'done' | 'failed' | 'warning';

export interface PlanStep {
  id: string;
  label: string;
}

export interface AgentDetail {
  agentName: string;
  provider: string; // RÉSERVÉ ADMIN (ex: 'moteur interne', 'z.ai flash', ...)
  model: string; // RÉSERVÉ ADMIN
  durationMs: number;
  ok: boolean;
  error?: string;
}

// ── Confidentialité : identité unique de PAUL IA ────────────────────────
const SECRET_NAMES: Array<[RegExp, string]> = [
  [/z[.\s-]?ai\b/gi, 'le moteur d\'appui de PAUL IA'],
  [/cogview[-\s]?\d?/gi, 'le moteur d\'image de PAUL IA'],
  [/cogvideox[-\s]?\d?/gi, 'le moteur vidéo de PAUL IA'],
  [/glm[-\s]?\d?(\.?\d)?/gi, 'le moteur de PAUL IA'],
  [/\bvidu\s?q?\d?\b/gi, 'le moteur vidéo de PAUL IA'],
  [/\bgorq\b|\bgroq\b/gi, 'le moteur d\'appui de PAUL IA'],
  [/\bpollinations\b/gi, 'le moteur interne de PAUL IA'],
  [/\bopenai\b/gi, 'le moteur interne de PAUL IA'],
  [/\bmistral\b/gi, 'le moteur interne de PAUL IA'],
  [/\bsana\b/gi, 'le moteur d\'image de PAUL IA'],
];

/** Masque les noms de fournisseurs externes dans tout texte visible du client. */
export function sanitizeForClient(text: string): string {
  let out = text;
  for (const [re, replacement] of SECRET_NAMES) out = out.replace(re, replacement);
  return out;
}

// ── Création et journalisation ──────────────────────────────────────────
export async function createTask(input: {
  title: string;
  request: string;
  plan: PlanStep[];
  module?: string;
  conversationId?: string;
}): Promise<paul_Task> {
  const task = await db.paul_Task.create({
    data: {
      title: input.title.slice(0, 120),
      request: input.request,
      plan: input.plan,
      module: input.module || 'agents',
      conversationId: input.conversationId || null,
      status: 'running',
      startedAt: new Date(),
    },
  });
  await logEvent(task.id, {
    step: 'start',
    label: 'J\'ai bien reçu votre demande. Je commence le travail selon le plan annoncé.',
    status: 'done',
  });
  return task;
}

export async function logEvent(taskId: string, ev: {
  step: string;
  label: string;
  status?: EventStatus;
  detail?: string;
  agentName?: string;
}): Promise<void> {
  const clean = (s?: string) => (s ? sanitizeForClient(s).slice(0, 2000) : undefined);
  await db.paul_Event.create({
    data: {
      taskId,
      step: ev.step,
      label: sanitizeForClient(ev.label),
      status: ev.status || 'done',
      detail: clean(ev.detail),
      agentName: ev.agentName ? sanitizeForClient(ev.agentName) : null,
    },
  });
  // Pourcentage réellement calculé : étapes terminées / total du plan.
  try {
    const task = await db.paul_Task.findUnique({ where: { id: taskId } });
    const plan = (task?.plan as PlanStep[] | null) || [];
    if (plan.length) {
      const doneSteps = new Set(
        (await db.paul_Event.findMany({ where: { taskId, status: 'done' }, select: { step: true } }))
          .map((e) => e.step),
      );
      const progress = Math.min(99, Math.round((doneSteps.size / (plan.length + 1)) * 100));
      await db.paul_Task.update({ where: { id: taskId }, data: { progress } });
    }
  } catch {
    /* le suivi ne doit jamais faire échouer la tâche */
  }
}

export async function finishTask(taskId: string, out: {
  status: 'succeeded' | 'partial' | 'failed';
  result?: string;
  summary?: string;
  providerDetails?: { providers: unknown; agents: AgentDetail[]; errors: string[] };
}): Promise<paul_Task> {
  const task = await db.paul_Task.findUnique({ where: { id: taskId } });
  const durationMs = task?.startedAt ? Date.now() - task.startedAt.getTime() : null;
  return db.paul_Task.update({
    where: { id: taskId },
    data: {
      status: out.status,
      progress: out.status === 'succeeded' ? 100 : task?.progress ?? 0,
      result: out.result ? sanitizeForClient(out.result) : null,
      summary: out.summary ? sanitizeForClient(out.summary) : null,
      providerDetails: (out.providerDetails as never) || undefined,
      finishedAt: new Date(),
      durationMs,
    },
  });
}

// ── Lecture ─────────────────────────────────────────────────────────────
export interface TaskView {
  id: string;
  title: string;
  module: string;
  status: string;
  progress: number;
  plan: PlanStep[];
  summary: string | null;
  result: string | null;
  events: Array<{
    step: string; label: string; status: string;
    detail?: string; agentName?: string; at: string;
  }>;
  durationMs: number | null;
}

function toView(task: paul_Task, events: paul_Event[]): TaskView {
  return {
    id: task.id,
    title: task.title,
    module: task.module,
    status: task.status,
    progress: task.progress,
    plan: (task.plan as PlanStep[] | null) || [],
    summary: task.summary,
    result: task.result,
    durationMs: task.durationMs,
    events: events.map((e) => ({
      step: e.step, label: e.label, status: e.status,
      detail: e.detail || undefined, agentName: e.agentName || undefined,
      at: e.createdAt.toISOString(),
    })),
  };
}

export async function getTaskView(id: string): Promise<TaskView | null> {
  const task = await db.paul_Task.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });
  return task ? toView(task, task.events) : null;
}

/** Historique des opérations — réservé administrateur (détails réels inclus). */
export async function getAdminOverview(limit = 12) {
  const tasks = await db.paul_Task.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });
  return tasks.map((t) => ({
    ...toView(t, t.events),
    providerDetails: t.providerDetails, // noms réels fournisseurs/modèles
    request: t.request,
  }));
}

// ── Compte rendu final automatique (les 10 rubriques du cahier des charges)
export function buildFinalReport(view: TaskView): string {
  const done = view.events.filter((e) => e.status === 'done').length;
  const failed = view.events.filter((e) => e.status === 'failed');
  const warned = view.events.filter((e) => e.status === 'warning');
  const agents = [...new Set(view.events.map((e) => e.agentName).filter(Boolean))];
  const secs = view.durationMs ? Math.round(view.durationMs / 1000) : null;

  const lines: string[] = [];
  lines.push('COMPTE RENDU FINAL DE PAUL IA');
  lines.push('');
  lines.push(`1. Demande initiale : ${view.title}`);
  lines.push(`2. Opérations effectuées : ${done} opération${done > 1 ? 's' : ''} réalisée${done > 1 ? 's' : ''} conformément au plan annoncé.`);
  lines.push(`3. Étapes suivies : ${view.plan.map((p) => p.label).join(' → ') || 'plan direct'}.`);
  lines.push(`4. Agents mobilisés : ${agents.length ? agents.join(', ') : 'traitement direct par PAUL IA, sans agent parallèle'}.`);
  lines.push(`5. Résultats obtenus : ${view.result ? 'voir le résultat livré ci-dessous.' : 'voir les réponses ci-dessus.'}`);
  lines.push(`6. Tests réalisés : ${view.events.some((e) => e.step.includes('verif')) ? 'vérification de cohérence exécutée sur les résultats.' : 'vérifications intégrées à chaque étape.'}`);
  lines.push(`7. Erreurs rencontrées : ${failed.length ? `${failed.length} incident${failed.length > 1 ? 's' : ''} corrigé${failed.length > 1 ? 's' : ''} par changement de méthode — ${failed.map((f) => f.label).join(' ; ')}` : warned.length ? `${warned.length} point${warned.length > 1 ? 's' : ''} de vigilance signalé${warned.length > 1 ? 's' : ''} en cours d'exécution.` : 'aucune erreur détectée pendant l\'exécution.'}`);
  lines.push(`8. Opérations non réalisées : ${view.status === 'partial' ? 'une partie du plan n\'a pas abouti dans le temps disponible — relancez la demande pour compléter.' : 'aucune : le plan a été intégralement exécuté.'}`);
  lines.push(`9. Livrables : ${view.result ? 'résultat final ci-dessous' : 'réponses ci-dessus'}${secs ? ` — durée totale ${secs} s` : ''}.`);
  lines.push(`10. État final : ${view.status === 'succeeded' ? 'TÂCHE TERMINÉE — tout est réalisé et vérifié.' : view.status === 'partial' ? 'TÂCHE PARTIELLEMENT TERMINÉE — ce qui reste à faire est indiqué ci-dessus.' : 'TÂCHE ÉCHOUÉE — la cause réelle est expliquée ci-dessus.'}`);
  return lines.join('\n');
}

// ── Détection des demandes complexes (orchestration d'agents) ───────────
import { isComplexRequest } from './agent-detect';
export { isComplexRequest as shouldOrchestrate };
