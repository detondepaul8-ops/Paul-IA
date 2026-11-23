#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# PUBLICATION COMPLÈTE PAUL IA — push GitHub → build Vercel → tests prod
# Usage: bash scripts/publish_now.sh
# Lit /tmp/paul-deploy/credentials.env — n'affiche JAMAIS les secrets.
# ════════════════════════════════════════════════════════════════════
set -e
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source /tmp/paul-deploy/credentials.env
PROD="https://pia-chat.vercel.app"
mask() { sed -E 's/ghp_[A-Za-z0-9]+/ghp_*** masked ***/g; s/vcp_[A-Za-z0-9]+/vcp_*** masked ***/g; s/x-access-token:[^@ ]+/*** masked ***/g; s#postgresql://[^ ]+#postgresql://*** masked ***/g'; }

echo "── 1/5 PUSH GitHub (main → detondepaul8-ops/Paul-IA) ──"
PUSH_OUT=$(git push "https://x-access-token:${GITHUB_TOKEN}@github.com/detondepaul8-ops/Paul-IA.git" main 2>&1) || { echo "$PUSH_OUT" | mask; echo "❌ push échoué"; exit 1; }
echo "$PUSH_OUT" | mask | tail -3

echo "── 2/5 DÉPLOIEMENT Vercel production (code fraîchement poussé) ──"
DEPLOY_RESULT=$(curl -s -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"paul-ia","project":"paul-ia","target":"production","gitSource":{"type":"github","org":"detondepaul8-ops","repo":"Paul-IA","ref":"main"}}')
DEPLOY_ID=$(echo "$DEPLOY_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
DEPLOY_URL=$(echo "$DEPLOY_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null)
if [ -z "$DEPLOY_ID" ]; then
  echo "❌ Déclenchement refusé:"; echo "$DEPLOY_RESULT" | mask | head -c 500; echo ""; exit 1
fi
echo "   🚀 build lancé: ${DEPLOY_URL:-$DEPLOY_ID}"

STATE=""
for i in $(seq 1 50); do
  sleep 10
  STATE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v13/deployments/$DEPLOY_ID" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('readyState',''))" 2>/dev/null)
  echo "   [$((i*10))s] $STATE"
  case "$STATE" in
    READY) break ;;
    ERROR|CANCELED)
      echo "❌ build $STATE — logs:"
      curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v2/deployments/$DEPLOY_ID/events?limit=30" \
        | python3 -c "
import sys, json
try:
    events = json.load(sys.stdin)
    for e in (events if isinstance(events, list) else []):
        t = (e.get('payload') or {}).get('text') or ''
        if t and ('error' in t.lower() or 'failed' in t.lower()): print(t[:300])
except Exception as ex: print('(logs illisibles:', ex, ')')" | mask | head -20
      exit 1 ;;
  esac
done
[ "$STATE" == "READY" ] || { echo "❌ timeout build (500s) — vérifier le dashboard Vercel"; exit 1; }
echo "   ✅ DÉPLOIEMENT RÉUSSI"

echo "── 3/5 BOOTSTRAP tables de suivi en production ──"
curl -s --max-time 60 "$PROD/api/bootstrap" | head -c 200; echo ""

echo "── 4/5 TESTS MÉDIA EN PRODUCTION ──"
curl -s --max-time 90 -X POST "$PROD/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"génère une image : coucher de soleil sur le lac Nokoué, photographie professionnelle"}' > /tmp/prod_img.json
sleep 10  # la source d'images ouverte limite le débit par IP : on laisse respirer
curl -s --max-time 90 -X POST "$PROD/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"crée une vidéo : un oiseau coloré vole au-dessus d une forêt verdoyante, caméra suivante"}' > /tmp/prod_vid.json
python3 -c "
import json
for name, path in (('IMAGE', '/tmp/prod_img.json'), ('VIDÉO', '/tmp/prod_vid.json')):
    try:
        d = json.load(open(path))
        full = json.dumps(d, ensure_ascii=False)
        bad = [w for w in ('textuel uniquement', 'assistant textuel', 'je ne peux pas générer') if w.lower() in full.lower()]
        leak = [w for w in ('Z.ai', 'CogView', 'CogVideoX', 'GLM', 'Groq', 'Pollinations', 'openai', 'mistral') if w in full]
        print(f'{name}: module={d.get(\"module\")} média={d.get(\"mediaType\")} url={bool(d.get(\"mediaUrl\"))} durée={d.get(\"durationMs\",\"?\")}')
        print(f'   refus interdit: {\"ABSENT ✓\" if not bad else f\"PRÉSENT ✗ {bad}\"} | masquage fournisseurs: {\"OK ✓\" if not leak else f\"FUITE ✗ {leak}\"}')
        print(f'   extrait: {(d.get(\"content\") or \"\")[:160]}'.replace(chr(10), ' '))
    except Exception as e:
        print(f'{name}: RÉPONSE ILLISIBLE ({e})')
"

echo "── 5/5 SÉPARATION ADMIN (401 attendu sans clé) ──"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$PROD/api/admin/tasks")
echo "   /api/admin/tasks sans clé: HTTP $CODE (attendu 401)"
echo ""
echo "✅ PUBLICATION TERMINÉE"
