#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# Snapshot de l'état du projet Supabase — AVANT/Après déploiement Paul IA
# Usage: ./snapshot-state.sh <DB_URL> <output_file>
# ════════════════════════════════════════════════════════════════════
DB_URL="$1"
OUT="${2:-/tmp/supabase-state.txt}"

{
echo "=== SNAPSHOT $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo ""
echo "--- TABLES (public) ---"
psql "$DB_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" 2>&1
echo ""
echo "--- LIGNES PAR TABLE EXISTANTE (autres apps) ---"
psql "$DB_URL" -t -c "
SELECT 'TABLECOUNT:' || relname || ':' || n_live_tup
FROM pg_stat_user_tables
WHERE schemaname='public'
ORDER BY relname;" 2>&1
echo ""
echo "--- FONCTIONS (public) ---"
psql "$DB_URL" -t -c "SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY proname;" 2>&1
echo ""
echo "--- BUCKETS STORAGE ---"
psql "$DB_URL" -t -c "SELECT id, public FROM storage.buckets ORDER BY id;" 2>&1
echo ""
echo "--- POLITIQUES RLS (tous schémas, résumé) ---"
psql "$DB_URL" -t -c "SELECT schemaname || '.' || tablename || ' :: ' || policyname FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname, tablename, policyname;" 2>&1
echo ""
echo "--- FICHIERS STORAGE PAR BUCKET (compte) ---"
psql "$DB_URL" -t -c "SELECT bucket_id || ':' || count(*) FROM storage.objects GROUP BY bucket_id ORDER BY bucket_id;" 2>&1
} > "$OUT" 2>&1

echo "Snapshot saved: $OUT"
cat "$OUT"