'use client';

// ── Panneau de suivi des opérations de PAUL IA en temps réel ────────────
// Étapes terminées / en cours / en attente, pourcentage réellement calculé,
// temps écoulé, erreurs, statut final. Les événements affichés correspondent
// aux opérations réellement exécutées (journalisation serveur).
import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/lib/chat-store';
import { CheckCircle2, CircleDashed, Loader2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface TaskEvent {
  step: string; label: string; status: string;
  detail?: string; agentName?: string; at: string;
}
interface TaskView {
  id: string; title: string; status: string; progress: number;
  plan: Array<{ id: string; label: string }>;
  summary: string | null; result: string | null;
  events: TaskEvent[]; durationMs: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  done: 'Terminé', running: 'En cours', pending: 'En attente',
  failed: 'Échec', warning: 'Intervention nécessaire',
};
const TASK_LABEL: Record<string, string> = {
  running: 'En cours', succeeded: 'Terminée', partial: 'Partiellement terminée', failed: 'Échouée',
};

export default function TaskProgress() {
  const activeTaskId = useChatStore((s) => s.activeTaskId);
  const setActiveTaskId = useChatStore((s) => s.setActiveTaskId);
  const addMessage = useChatStore((s) => s.addMessage);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const [task, setTask] = useState<TaskView | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const deliveredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeTaskId) { setTask(null); return; }
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/tasks/${activeTaskId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('tâche indisponible');
        const data: TaskView = await res.json();
        if (!alive) return;
        setTask(data);
        if (['succeeded', 'partial', 'failed'].includes(data.status)) {
          // Livraison du résultat dans la conversation (une seule fois)
          if (deliveredRef.current !== data.id) {
            deliveredRef.current = data.id;
            const body = [data.result, data.summary].filter(Boolean).join('\n\n');
            if (body) {
              addMessage({ id: crypto.randomUUID(), role: 'assistant', content: body, module: 'agents' });
            }
          }
          if (data.durationMs !== null) { setActiveTaskId(null); return; }
        }
      } catch { /* la tâche reste consultable : on relance le tick */ }
    };
    tick();
    const interval = setInterval(tick, 2000);
    const clock = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { alive = false; clearInterval(interval); clearInterval(clock); };
  }, [activeTaskId, addMessage, setActiveTaskId]);

  if (!activeTaskId || !task) return null;

  const doneSteps = new Set(task.events.filter((e) => e.status === 'done').map((e) => e.step));
  const progress = task.progress;
  const statusIcon = (s: string) => s === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    : s === 'running' ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
    : s === 'failed' ? <XCircle className="h-4 w-4 text-red-600" />
    : s === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-600" />
    : <CircleDashed className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-2">
      <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
            <span className="font-medium">{progress} %</span>
          </div>
        </div>

        {/* Progression : barre réelle calculée côté serveur */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Plan annoncé + statut réel de chaque étape */}
        <ul className="space-y-1.5">
          {task.plan.map((step) => {
            const ev = [...task.events].reverse().find((e) => e.step === step.id || e.step.startsWith(`agent-`) && step.id === 'agents');
            const st = ev?.status || (doneSteps.has(step.id) ? 'done' : 'pending');
            return (
              <li key={step.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0">{statusIcon(st)}</span>
                <span className="flex-1 min-w-0">
                  <span className={st === 'done' ? 'text-foreground' : st === 'pending' ? 'text-muted-foreground' : 'text-foreground font-medium'}>
                    {step.label}
                  </span>
                  {ev?.agentName && (
                    <span className="ml-1.5 text-xs text-muted-foreground">({ev.agentName})</span>
                  )}
                  {ev?.status === 'warning' && (
                    <span className="ml-1.5 text-xs text-amber-600">{STATUS_LABEL.warning}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Journal des événements réels (agents, erreurs, livraisons) */}
        {task.events.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-2.5 max-h-44 overflow-y-auto text-xs space-y-1.5">
            {task.events.slice(-8).map((e) => (
              <div key={e.id ?? e.at} className="flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">{statusIcon(e.status)}</span>
                <span className="flex-1 text-muted-foreground">
                  {e.label}
                  {e.detail && <span className="block text-[11px] opacity-70">{e.detail}</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          État final : {TASK_LABEL[task.status] || task.status}
          {task.status === 'partial' && ' — ce qui reste à faire est indiqué dans le compte rendu.'}
        </div>
      </div>
    </div>
  );
}
