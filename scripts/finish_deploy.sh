#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# ACHÈVEMENT AUTOMATIQUE DE LA PHASE 3/4 PAUL IA
# Usage: bash scripts/finish_deploy.sh
# Prérequis (fournis par l'administrateur) — /tmp/paul-deploy/credentials.env :
#   GITHUB_TOKEN=ghp_...        (repo detondepaul8-ops/Paul-IA, contents:write)
#   VERCEL_TOKEN=...            (compte Vercel des déploiements paul-ia)
#   DB_URL=postgresql://...     (base Supabase utilisée par paul-ia)
#   SUPABASE_URL=https://...
#   SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_KEY=...
# Le script ne jamaïs affiche les valeurs des secrets.
# ════════════════════════════════════════════════════════════════════
set -e
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CREDS_FILE="/tmp/paul-deploy/credentials.env"
PROD="https://pia-chat.vercel.app"

[ -f "$CREDS_FILE" ] || { echo "❌ Créez /tmp/paul-deploy/credentials.env (voir l'en-tête de ce script)"; exit 1; }
source "$CREDS_FILE"
[ -n "$GITHUB_TOKEN" ] || { echo "❌ GITHUB_TOKEN manquant (push du code)"; exit 1; }
[ -n "$VERCEL_TOKEN" ] || { echo "❌ VERCEL_TOKEN manquant (déploiement)"; exit 1; }

echo "── 1/6 PUSH GitHub (code Phase 3 : agents, suivi, monitor, admin) ──"
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/detondepaul8-ops/Paul-IA.git" main 2>&1 | sed 's/x-access-token:[^@]*/***' | tail -2

echo "── 2/6 DÉPLOIEMENT Vercel ──"
bash scripts/deploy.sh

echo "── 3/6 BOOTSTRAP des tables de suivi (paul_tasks, paul_events) ──"
curl -s --max-time 60 "$PROD/api/bootstrap" | head -c 300; echo ""

echo "── 4/6 TEST AGENTS PARALLÈLES EN PRODUCTION ──"
TASK_JSON=$(curl -s --max-time 30 -X POST "$PROD/api/tasks" -H "Content-Type: application/json" \
  -d '{"message":"mobilise tes agents : analyse approfondie des avantages du paiement mobile au Bénin pour un e-commerce","force":true}')
TASK_ID=$(echo "$TASK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('taskId',''))" 2>/dev/null)
echo "taskId: $TASK_ID"
if [ -n "$TASK_ID" ]; then
  for i in $(seq 1 30); do
    sleep 5
    S=$(curl -s --max-time 20 "$PROD/api/tasks/$TASK_ID")
    STATUS=$(echo "$S" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
    PROG=$(echo "$S" | python3 -c "import sys,json; print(json.load(sys.stdin).get('progress',''))" 2>/dev/null)
    EVS=$(echo "$S" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('events',[])))" 2>/dev/null)
    echo "  [$((i*5))s] statut=$STATUS progression=$PROG% événements=$EVS"
    case "$STATUS" in succeeded|partial|failed) break ;; esac
  done
  echo "$S" > /tmp/final_task.json
  python3 - <<'PYEOF'
import json
d = json.load(open('/tmp/final_task.json'))
result = (d.get('result') or '')[:400]
full = json.dumps(d, ensure_ascii=False)
print('  COMPTE RENDU (extrait):', (d.get('summary') or '')[:200])
print('  RÉSULTAT (extrait):', result[:200].replace('\n', ' '))
leak = [w for w in ('Z.AI', 'Z.ai', 'CogView', 'CogVideoX', 'GLM', 'Groq', 'Pollinations', 'openai', 'mistral') if w in full]
print('  MASQUAGE FOURNISSEURS:', 'OK' if not leak else f'FUITE: {leak}')
PYEOF
fi

echo "── 5/6 TEST IMAGE + VIDÉO (chat, suivi média) ──"
curl -s --max-time 120 -X POST "$PROD/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"génère une image : coucher de soleil sur le lac Nokoué, photographie professionnelle"}' > /tmp/final_img.json
python3 -c "
import json
d = json.load(open('/tmp/final_img.json'))
full = json.dumps(d, ensure_ascii=False)
print('  image:', d.get('module'), '| média:', d.get('mediaType'), '| task:', bool(d.get('taskId')))
print('  masquage:', 'OK' if not any(w in full for w in ('Z.ai','CogView','GLM','sana')) else 'FUITE')"
curl -s --max-time 120 -X POST "$PROD/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"crée une vidéo : un oiseau coloré vole au-dessus d une forêt verdoyante, caméra suivante"}' > /tmp/final_vid.json
python3 -c "
import json
d = json.load(open('/tmp/final_vid.json'))
print('  vidéo:', d.get('module'), '| média:', d.get('mediaType'), '| task:', bool(d.get('taskId')))
print('  extrait:', (d.get('content') or '')[:180].replace(chr(10),' '))"

echo "── 6/6 SÉPARATION ADMIN (401 attendu sans clé) ──"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$PROD/api/admin/tasks")
echo "  /api/admin/tasks sans clé : HTTP $CODE (attendu 401)"

echo ""
echo "✅ ACHÈVEMENT TERMINÉ — examinez les lignes ci-dessus pour les verdicts."
