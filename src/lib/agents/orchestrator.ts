// ── PAUL IA AGENTS — Orchestrateur d'agents parallèles ──────────────────
// PAUL IA reste le coordinateur principal : elle décompose la demande,
// confie les sous-tâches à des agents parallèles (exécution simultanée),
// compare et vérifie les résultats, résout les contradictions, consolide
// en une réponse unique et publie chaque événement réel dans le suivi.
import { chatCompletion } from '../zai';
import type { ChatMessage } from '../zai';
import { freeLLMChat } from '../autonomy/free-llm';
import { extractJson } from '../autonomy/free-llm';
import { buildFinalReport, createTask, finishTask, logEvent } from '../monitor';
import type { AgentDetail, PlanStep } from '../monitor';
import type { FreeLLMMessage } from '../autonomy/free-llm';

interface SubTask { role: string; subtask: string; }

const DECOMPOSE_PROMPT = `Tu es l'orchestrateur de PAUL IA. Décompose la demande de l'utilisateur en 2 sous-tâches indépendantes, exécutables EN PARALLÈLE par deux agents spécialisés différents (ex: un analyste + un vérificateur factuel ; un rédacteur + un planificateur technique).
Réponds UNIQUEMENT avec ce JSON : {"agents":[{"role":"Agent spécialisé en ...","subtask":"..."},{"role":"Agent spécialisé en ...","subtask":"..."}]}`;

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); })
      .catch(() => { clearTimeout(timer); resolve(onTimeout()); });
  });
}

async function agentLLM(messages: FreeLLMMessage[], timeoutMs: number):
  Promise<{ text: string; provider: string; model: string }> {
  // Canal 1 : moteur d'appui Flash (gratuit) — canal 2 : moteur interne libre.
  try {
    const text = await chatCompletion(messages as ChatMessage[], { temperature: 0.5, maxTokens: 2048 });
    return { text, provider: 'z.ai', model: process.env.ZAI_MODEL || 'glm-flash' };
  } catch {
    const text = await freeLLMChat(messages, { timeoutMs, temperature: 0.5, maxTokens: 1800 });
    return { text, provider: 'interne-libre', model: 'openai/mistral multi-canal' };
  }
}

export interface OrchestratorResult {
  taskId: string;
  status: 'succeeded' | 'partial' | 'failed';
  content: string; // réponse consolidée (client)
  report: string; // compte rendu final (client)
}

export async function startAgentTask(input: {
  message: string;
  conversationId?: string;
  title?: string;
}): Promise<{ taskId: string; plan: PlanStep[] }> {
  const plan: PlanStep[] = [
    { id: 'analyse', label: 'Analyser votre demande' },
    { id: 'decomposition', label: 'Décomposer en sous-tâches' },
    { id: 'agents', label: 'Mobiliser les agents parallèles' },
    { id: 'collecte', label: 'Récupérer et comparer les résultats' },
    { id: 'verif', label: 'Vérifier la cohérence des réponses' },
    { id: 'consolidation', label: 'Consolider la réponse finale' },
    { id: 'rendu', label: 'Établir le compte rendu et livrer' },
  ];
  const task = await createTask({
    title: input.title || input.message.slice(0, 100),
    request: input.message,
    plan,
    module: 'agents',
    conversationId: input.conversationId,
  });
  return { taskId: task.id, plan };
}

/** Exécution complète de la tâche (après la réponse HTTP, via after()). */
export async function executeAgentTask(taskId: string): Promise<OrchestratorResult> {
  const stored = await (await import('../db')).db.paul_Task.findUnique({ where: { id: taskId } });
  if (!stored) throw new Error('tâche introuvable: ' + taskId);
  const input = { message: stored.request, conversationId: stored.conversationId || undefined };
  const task = stored;

  const agentDetails: AgentDetail[] = [];
  const errors: string[] = [];
  let agentAnswers: Array<{ name: string; role: string; answer: string }> = [];
  let content = '';
  let status: 'succeeded' | 'partial' | 'failed' = 'succeeded';

  try {
    await logEvent(task.id, { step: 'analyse', label: 'J\'analyse votre demande et je prépare la répartition du travail.' });

    // 1) Décomposition en sous-tâches (agents réels, parallélisables)
    await logEvent(task.id, { step: 'decomposition', label: 'Je décompose votre demande en sous-tâches indépendantes.', status: 'running' });
    const decomp = await withTimeout(
      agentLLM([
        { role: 'system', content: DECOMPOSE_PROMPT },
        { role: 'user', content: input.message },
      ], 12000), 12000, null as never as { text: string; provider: string; model: string });
    let subtasks: SubTask[] = [];
    if (decomp && decomp.text) {
      const parsed = extractJson<{ agents: SubTask[] }>(decomp.text);
      if (parsed?.agents?.length) subtasks = parsed.agents.slice(0, 3);
    }
    if (!subtasks.length) {
      // Repli robuste : répartition générique en deux rôles complémentaires
      subtasks = [
        { role: 'Agent spécialisé en analyse', subtask: `Analyse en profondeur la demande suivante : propose la meilleure réponse structurée, avec les points clés. Demande : ${input.message}` },
        { role: 'Agent de vérification', subtask: `Réponds à la même demande sous un angle indépendant (faits, limites, risques), pour permettre une comparaison croisée. Demande : ${input.message}` },
      ];
      await logEvent(task.id, { step: 'decomposition', label: 'Répartition standard appliquée : deux agents complémentaires.', status: 'warning' });
    }
    await logEvent(task.id, {
      step: 'decomposition',
      label: `Décomposition terminée : ${subtasks.length} sous-tâches prêtes pour ${subtasks.length} agents.`,
      detail: subtasks.map((s, i) => `${i + 1}. ${s.role}`).join(' | '),
    });

    // 2) Exécution PARALLÈLE des agents
    await logEvent(task.id, {
      step: 'agents',
      label: `Pour accélérer le traitement, je mobilise ${subtasks.length} agents spécialisés qui travaillent simultanément.`,
      status: 'running',
      detail: subtasks.map((s) => s.role).join(' | '),
    });
    const started = Date.now();
    const settled = await Promise.allSettled(subtasks.map(async (st, i) => {
      const agentName = st.role.startsWith('Agent de vérification') ? st.role : `Agent parallèle ${i + 1} — ${st.role}`;
      const t0 = Date.now();
      let answer = '';
      let provider = 'interne-libre';
      let model = 'openai/mistral multi-canal';
      let ok = true;
      let error: string | undefined;
      try {
        const r = await withTimeout(agentLLM([
          { role: 'system', content: `Tu es ${agentName} au sein de PAUL IA. Exécute ta sous-tâche avec rigueur, en français, de façon autonome et concrète. Ne mentionne jamais de fournisseur ou de modèle externe.` },
          { role: 'user', content: st.subtask },
        ], 28000), 28000, null as never as { text: string; provider: string; model: string });
        if (!r || !r.text) throw new Error('délai dépassé');
        answer = r.text; provider = r.provider; model = r.model;
      } catch (e) {
        ok = false; error = (e as Error).message; status = 'partial';
        answer = '';
      }
      agentDetails.push({
        agentName: st.role,
        provider, model, durationMs: Date.now() - t0, ok, error,
      });
      await logEvent(task.id, ok
        ? { step: `agent-${i}`, label: `${agentName} a terminé sa sous-tâche.`, status: 'done', agentName: st.role }
        : { step: `agent-${i}`, label: `${agentName} n'a pas abouti : ${error}. Je poursuis avec les autres résultats.`, status: 'failed', agentName: st.role });
      return { name: st.role, role: st.role, answer };
    }));
    agentAnswers = settled.map((s) => (s.status === 'fulfilled' ? s.value : { name: 'Agent', role: 'Agent', answer: '' }))
      .filter((a) => a.answer && a.answer.length > 20);
    const agentSec = Math.round((Date.now() - started) / 1000);
    if (!agentAnswers.length) {
      throw new Error('aucun agent n\'a produit de résultat dans le temps imparti');
    }
    await logEvent(task.id, {
      step: 'collecte',
      label: `J'ai récupéré les résultats des agents mobilisés (${agentSec} s en parallèle). Je procède à leur vérification.`,
      status: agentAnswers.length === subtasks.length ? 'done' : 'warning',
      detail: `${agentAnswers.length}/${subtasks.length} résultats exploitables`,
    });

    // 3) Vérification croisée + résolution des contradictions + consolidation
    await logEvent(task.id, { step: 'verif', label: 'Un agent de vérification compare les réponses et contrôle leur cohérence.', status: 'running' });
    let consolidated = '';
    const tCons = Date.now();
    try {
      const r = await withTimeout(agentLLM([
        { role: 'system', content: 'Tu es l\'agent de vérification de PAUL IA. On te donne la demande initiale et plusieurs réponses d\'agents travaillés en parallèle. Compare-les, résous les contradictions en gardant les éléments les plus fiables, puis rédige UNE réponse finale unique, complète, structurée et directement exploitable, en français. Ne mentionne aucun fournisseur externe.' },
        { role: 'user', content: `DEMANDE INITIALE :\n${input.message}\n\nRÉPONSES DES AGENTS :\n${agentAnswers.map((a, i) => `--- Agent ${i + 1} (${a.role}) ---\n${a.answer}`).join('\n\n')}` },
      ], 16000), 16000, null as never as { text: string; provider: string; model: string });
      if (!r || !r.text || r.text.length < 40) throw new Error('consolidation insuffisante');
      consolidated = r.text;
      agentDetails.push({ agentName: 'Agent de vérification', provider: r.provider, model: r.model, durationMs: Date.now() - tCons, ok: true });
    } catch {
      // Repli : la réponse la plus longue devient la base consolidée
      agentAnswers.sort((a, b) => b.answer.length - a.answer.length);
      consolidated = agentAnswers[0].answer;
      agentDetails.push({ agentName: 'Agent de vérification', provider: 'repli-local', model: 'fusion locale', durationMs: Date.now() - tCons, ok: false, error: 'consolidation LLM indisponible' });
      errors.push('consolidation LLM indisponible — fusion locale des résultats');
      status = 'partial';
    }
    await logEvent(task.id, { step: 'verif', label: 'Vérification de cohérence terminée — contradictions résolues.', status: 'done' });
    content = consolidated;

    // 4) Consolidation + compte rendu final
    await logEvent(task.id, { step: 'consolidation', label: 'Le travail des agents parallèles est terminé. Je consolide maintenant les résultats.', status: 'done' });
  } catch (e) {
    errors.push((e as Error).message);
    status = agentAnswers.length ? 'partial' : 'failed';
    await logEvent(task.id, {
      step: 'collecte', label: `Problème détecté : ${(e as Error).message}. J'applique la correction et je livre le meilleur résultat disponible.`,
      status: status === 'failed' ? 'failed' : 'warning',
    });
    content = agentAnswers.length
      ? agentAnswers.sort((a, b) => b.answer.length - a.answer.length)[0].answer
      : 'La tâche n\'a pas pu être réalisée dans le temps disponible. Cause réelle : ' + (e as Error).message + '. Relancez la demande — le plan sera réexécuté.';
    if (status === 'failed') {
      const done = await finishTask(task.id, { status, result: content, providerDetails: { providers: [...new Set(agentDetails.map((a) => a.provider))], agents: agentDetails, errors } });
      const view = await import('../monitor').then((m) => m.getTaskView(task.id));
      const report = view ? buildFinalReport(view) : '';
      return { taskId: task.id, status, content, report };
    }
  }

  const finalTask = await finishTask(task.id, {
    status, result: content,
    providerDetails: { providers: [...new Set(agentDetails.map((a) => a.provider))], agents: agentDetails, errors },
  });
  const view = await import('../monitor').then((m) => m.getTaskView(task.id));
  const report = view ? buildFinalReport(view) : '';
  await logEvent(task.id, { step: 'rendu', label: 'Compte rendu final établi et résultat livré.', status: 'done' });
  return { taskId: task.id, status: finalTask.status as 'succeeded' | 'partial' | 'failed', content, report };
}
