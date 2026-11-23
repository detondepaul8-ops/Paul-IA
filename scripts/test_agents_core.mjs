// TEST RÉEL DU CŒUR D'AGENTS PAUL IA (sans couche DB, moteurs réels)
// Valide : décomposition LLM en JSON, exécution PARALLÈLE de 2 agents,
// consolidation/vérification croisée. Chronométrage du parallélisme.
const ENDPOINT = 'https://text.pollinations.ai/openai';

// Cascade identique au moteur interne de PAUL IA (free-llm.ts) :
// POST openai → POST mistral → GET simple, avec 2 tentatives par canal.
async function llm(messages, timeoutMs = 45000) {
  const t0 = Date.now();
  const channels = [
    { kind: 'post', model: 'openai' },
    { kind: 'post', model: 'mistral' },
    { kind: 'get' },
  ];
  let lastErr;
  for (const ch of channels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let res;
        if (ch.kind === 'post') {
          res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: ch.model, messages, temperature: 0.5, max_tokens: 1600, referrer: 'paul-ia' }),
            signal: AbortSignal.timeout(timeoutMs),
          });
        } else {
          const url = new URL('https://text.pollinations.ai/');
          url.searchParams.set('system', messages.filter(m => m.role === 'system').map(m => m.content).join('\n'));
          url.searchParams.set('model', 'openai');
          res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = ch.kind === 'post'
          ? (await res.json()).choices?.[0]?.message?.content || ''
          : await res.text();
        const ms = Date.now() - t0;
        if (!text.trim()) throw new Error('réponse vide');
        return { text, ms };
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 1200 + attempt * 1500));
      }
    }
  }
  throw lastErr;
}

function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

const DEMANDE = 'Analyse approfondie : pour une plateforme de e-commerce au Bénin, faut-il privilégier le paiement mobile (MTN MoMo, Moov) ou les cartes bancaires ? Compare les deux approches en détail avec leurs avantages et leurs limites.';

const DECOMPOSE_PROMPT = `Tu es l'orchestrateur de PAUL IA. Décompose la demande de l'utilisateur en 2 sous-tâches indépendantes, exécutables EN PARALLÈLE par deux agents spécialisés différents.
Réponds UNIQUEMENT avec ce JSON : {"agents":[{"role":"Agent spécialisé en ...","subtask":"..."},{"role":"Agent spécialisé en ...","subtask":"..."}]}`;

async function main() {
  const total0 = Date.now();
  console.log('=== 1. DÉCOMPOSITION ===');
  const decomp = await llm([
    { role: 'system', content: DECOMPOSE_PROMPT },
    { role: 'user', content: DEMANDE },
  ]);
  const parsed = extractJson(decomp.text);
  const agents = parsed?.agents?.slice(0, 2);
  if (!agents) {
    console.log('JSON non parsé, réponse brute:', decomp.text.slice(0, 300));
    process.exit(1);
  }
  console.log(`décomposition OK en ${(decomp.ms / 1000).toFixed(1)}s`);
  agents.forEach((a, i) => console.log(`  Agent ${i + 1}: ${a.role}`));

  console.log('=== 2. AGENTS EN PARALLÈLE ===');
  const tPar = Date.now();
  const [r1, r2] = await Promise.allSettled([
    llm([
      { role: 'system', content: `Tu es Agent parallèle 1 — ${agents[0].role} au sein de PAUL IA. Réponds en français, structuré, 300 mots max.` },
      { role: 'user', content: agents[0].subtask },
    ]),
    llm([
      { role: 'system', content: `Tu es Agent parallèle 2 — ${agents[1].role} au sein de PAUL IA. Réponds en français, structuré, 300 mots max.` },
      { role: 'user', content: agents[1].subtask },
    ]),
  ]);
  const parSec = (Date.now() - tPar) / 1000;
  const answers = [r1, r2].map((r, i) => r.status === 'fulfilled'
    ? { ok: true, ms: r.value.ms, text: r.value.text }
    : { ok: false, err: r.reason?.message, ms: 0 });
  answers.forEach((a, i) => console.log(`  Agent ${i + 1}: ${a.ok ? `terminé en ${(a.ms / 1000).toFixed(1)}s` : `ÉCHEC: ${a.err}`} (${a.text?.length || 0} caractères)`));
  console.log(`durée totale du bloc parallèle: ${parSec.toFixed(1)}s (somme individuelles ≈ ${((answers[0].ms + answers[1].ms) / 1000).toFixed(1)}s)`);
  const parallelismOk = answers.every(a => a.ok) && parSec < ((answers[0].ms + answers[1].ms) / 1000) * 0.75;
  console.log(`parallélisme vérifié: ${parallelismOk ? 'OUI' : 'NON'}`);

  console.log('=== 3. VÉRIFICATION + CONSOLIDATION ===');
  const ok = answers.filter(a => a.ok);
  const cons = await llm([
    { role: 'system', content: "Tu es l'agent de vérification de PAUL IA. Compare les réponses des agents, résous les contradictions, puis rédige UNE réponse finale unique et structurée, en français, sans mention de fournisseur externe." },
    { role: 'user', content: `DEMANDE INITIALE :\n${DEMANDE}\n\nRÉPONSES DES AGENTS :\n${ok.map((a, i) => `--- Agent ${i + 1} ---\n${a.text}`).join('\n\n')}` },
  ]);
  console.log(`consolidation OK en ${(cons.ms / 1000).toFixed(1)}s (${cons.text.length} caractères)`);
  console.log('--- extrait de la réponse consolidée ---');
  console.log(cons.text.slice(0, 400));

  const totalSec = (Date.now() - total0) / 1000;
  console.log('=== SYNTHÈSE DU TEST ===');
  console.log(JSON.stringify({
    decomposition: 'OK',
    agents_paralleles: ok.length + '/' + answers.length,
    parallelisme_verifie: parallelismOk,
    consolidation: 'OK',
    duree_totale_s: Math.round(totalSec),
    fournisseurs_masques: !/pollinations|openai|z\.ai|glm/i.test(cons.text),
  }, null, 2));
}

main().catch((e) => { console.error('ÉCHEC DU TEST:', e.message); process.exit(1); });
