#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# Déploiement Paul IA — ORCHESTRATEUR SÉCURISÉ
# Usage: bash deploy.sh
# Lit les credentials depuis /tmp/paul-deploy/credentials.env
# Format du fichier:
#   DB_URL=postgresql://...
#   SUPABASE_URL=https://xxx.supabase.co
#   SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_KEY=...
# ════════════════════════════════════════════════════════════════════
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREDS_FILE="/tmp/paul-deploy/credentials.env"

[ -f "$CREDS_FILE" ] || { echo "❌ Credentials manquants: $CREDS_FILE"; exit 1; }
source "$CREDS_FILE"

for var in DB_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_KEY VERCEL_TOKEN; do
  [ -n "${!var}" ] || { echo "❌ Variable manquante: $var"; exit 1; }
done

SNAPSHOT_DIR="/tmp/paul-deploy"
mkdir -p "$SNAPSHOT_DIR"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   DÉPLOIEMENT PAUL IA — MODE SÉCURISÉ                    ║"
echo "╚══════════════════════════════════════════════════════════╝"

# ─────────────────────────────────────────────
# ÉTAPE 1: SNAPSHOT AVANT
# ─────────────────────────────────────────────
echo ""
echo "📍 ÉTAPE 1/6 — Snapshot AVANT (état du projet partagé)"
node "$SCRIPT_DIR/snapshot-state.js" "$DB_URL" "$SNAPSHOT_DIR/before.json"

# ─────────────────────────────────────────────
# ÉTAPE 2: SETUP SUPABASE (additif)
# ─────────────────────────────────────────────
echo ""
echo "📍 ÉTAPE 2/6 — Création ressources Paul IA (additif uniquement)"
node "$SCRIPT_DIR/setup-supabase.js" "$DB_URL"

# ─────────────────────────────────────────────
# ÉTAPE 3: SNAPSHOT APRÈS + INTÉGRITÉ
# ─────────────────────────────────────────────
echo ""
echo "📍 ÉTAPE 3/6 — Vérification intégrité (protection Factory IA & co)"
node "$SCRIPT_DIR/snapshot-state.js" "$DB_URL" "$SNAPSHOT_DIR/after.json" >/dev/null
node "$SCRIPT_DIR/verify-integrity.js" "$DB_URL" "$SNAPSHOT_DIR/before.json" "$SNAPSHOT_DIR/after.json"

# ─────────────────────────────────────────────
# ÉTAPE 4: PROJET VERCEL (création isolée)
# ─────────────────────────────────────────────
echo ""
echo "📍 ÉTAPE 4/6 — Projet Vercel 'paul-ia' (création isolée)"

CREATE_RESULT=$(curl -s -X POST "https://api.vercel.com/v10/projects" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"paul-ia\",\"framework\":\"nextjs\"}")
PROJECT_ID=$(echo "$CREATE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects/paul-ia" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  echo "   ℹ️  Projet existant: $PROJECT_ID"
else
  echo "   ✅ Projet créé: $PROJECT_ID"
fi

# ─────────────────────────────────────────────
# ÉTAPE 5: VARIABLES D'ENVIRONNEMENT
# ─────────────────────────────────────────────
echo ""
echo "📍 ÉTAPE 5/6 — Variables d'environnement"

set_env() {
  local key="$1" value="$2"
  curl -s -X DELETE "https://api.vercel.com/v9/projects/paul-ia/env?key=$key" \
    -H "Authorization: Bearer $VERCEL_TOKEN" >/dev/null 2>&1
  local result=$(curl -s -X POST "https://api.vercel.com/v10/projects/paul-ia/env" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$key\",\"value\":\"$value\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\",\"development\"]}")
  local err=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); e=d.get('error',{}).get('message'); print(e) if e else print('ok')" 2>/dev/null)
  if [ "$err" == "ok" ]; then
    echo "   ✅ $key"
  else
    echo "   ❌ $key: $err"
  fi
}

set_env "DATABASE_URL" "$DB_URL"
set_env "DIRECT_URL" "$DB_URL"
set_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY"
set_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_KEY"

# ─────────────────────────────────────────────
# ÉTAPE 6: DÉPLOIEMENT
# ─────────────────────────────────────────────
echo ""
echo "📍 ÉTAPE 6/6 — Déploiement production"

DEPLOY_RESULT=$(curl -s -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"paul-ia","project":"paul-ia","target":"production","gitSource":{"type":"github","org":"detondepaul8-ops","repo":"Paul-IA","ref":"main"}}')
DEPLOY_ID=$(echo "$DEPLOY_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
DEPLOY_URL=$(echo "$DEPLOY_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null)

if [ -z "$DEPLOY_ID" ]; then
  echo "❌ Déploiement non déclenché:"
  echo "$DEPLOY_RESULT" | head -c 400; echo ""
  exit 1
fi
echo "   🚀 Build lancé: $DEPLOY_URL"

# Suivi
for i in $(seq 1 60); do
  sleep 10
  STATE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v13/deployments/$DEPLOY_ID" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('readyState',''))" 2>/dev/null)
  echo "   [$((i*10))s] $STATE"
  case "$STATE" in
    READY)
      echo ""
      echo "╔══════════════════════════════════════════════════════════╗"
      echo "║   ✅ DÉPLOIEMENT RÉUSSI                                  ║"
      echo "║   🌐 https://paul-ia.vercel.app                          ║"
      echo "║   🔗 https://$DEPLOY_URL"
      echo "╚══════════════════════════════════════════════════════════╝"
      exit 0 ;;
    ERROR|CANCELED)
      echo "   ❌ Échec du build — récupération des logs:"
      curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v2/deployments/$DEPLOY_ID/events?limit=20" \
        | python3 -c "
import sys, json
events = json.load(sys.stdin)
if isinstance(events, list):
    for e in events[-15:]:
        t = str(e.get('payload',{}).get('text',''))
        if t: print('   |', t[:150])
"
      exit 1 ;;
  esac
done
echo "⏱️  Timeout du suivi (build toujours en cours)"