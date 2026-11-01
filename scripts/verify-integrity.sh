#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# Vérification d'intégrité : compare avant/après déploiement Paul IA
# Usage: ./verify-integrity.sh <DB_URL> <before_file> <after_file>
# ════════════════════════════════════════════════════════════════════
DB_URL="$1"
BEFORE="$2"
AFTER="$3"

if [ ! -f "$BEFORE" ] || [ ! -f "$AFTER" ]; then
  echo "❌ Fichiers snapshot manquants"; exit 1
fi

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  VÉRIFICATION D'INTÉGRITÉ — Projets existants            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

FAIL=0

# 1. Aucune table existante ne doit disparaître
echo "1️⃣  Tables existantes intactes :"
while read -r table; do
  [ -z "$table" ] && continue
  [[ "$table" == paul_* ]] && continue  # les tables paul_ sont autorisées
  if ! grep -qx "$table" <(psql "$DB_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"); then
    echo "   ❌ TABLE DISPARUE: $table"; FAIL=1
  fi
done < <(sed -n '/--- TABLES/,/^$/p' "$BEFORE" | grep -v '^---' | grep -v '^$' | tr -d ' ')

# 2. Aucune table existante ne doit perdre de lignes
echo "2️⃣  Données existantes intactes :"
sed -n '/TABLECOUNT/p' "$BEFORE" | while IFS= read -r line; do
  tname=$(echo "$line" | cut -d: -f2)
  tcount=$(echo "$line" | cut -d: -f3)
  [[ "$tname" == paul_* ]] && continue
  newcount=$(psql "$DB_URL" -t -c "SELECT n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' AND relname='$tname';" 2>/dev/null | tr -d ' ')
  # ANALYZE pour rafraîchir les stats si 0
  if [ "$newcount" == "0" ] && [ "$tcount" != "0" ]; then
    psql "$DB_URL" -c "ANALYZE $tname;" >/dev/null 2>&1
    newcount=$(psql "$DB_URL" -t -c "SELECT n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' AND relname='$tname';" 2>/dev/null | tr -d ' ')
  fi
  if [ "$newcount" -lt "$tcount" ] 2>/dev/null; then
    echo "   ❌ PERTES DE DONNÉES: $tname ($tcount → $newcount)"; FAIL=1
  else
    echo "   ✅ $tname: $tcount lignes (inchangé ou plus)"
  fi
done

# 3. Buckets existants intacts
echo "3️⃣  Buckets de stockage existants :"
while read -r bucket; do
  [ -z "$bucket" ] && continue
  [[ "$bucket" == paul-* ]] && continue
  if ! psql "$DB_URL" -t -c "SELECT id FROM storage.buckets WHERE id='$bucket';" 2>/dev/null | grep -q "$bucket"; then
    echo "   ❌ BUCKET DISPARU: $bucket"; FAIL=1
  fi
done < <(sed -n '/--- BUCKETS/,/^$/p' "$BEFORE" | grep '|' | cut -d'|' -f1 | tr -d ' ')

# 4. Politiques RLS existantes intacts
echo "4️⃣  Politiques RLS existantes :"
BEFORE_POLICIES=$(sed -n '/--- POLITIQUES/,/^$/p' "$BEFORE" | grep '::' | sort)
AFTER_POLICIES=$(sed -n '/--- POLITIQUES/,/^$/p' "$AFTER" | grep '::' | sort)
LOST=$(comm -23 <(echo "$BEFORE_POLICIES") <(echo "$AFTER_POLICIES") | grep -v 'paul_')
if [ -n "$LOST" ]; then
  echo "   ❌ POLITIQUES DISPARUES:"
  echo "$LOST" | sed 's/^/      /'
  FAIL=1
else
  echo "   ✅ Toutes les politiques existantes sont préservées"
fi

# 5. Fichiers storage existants intacts
echo "5️⃣  Fichiers de stockage existants :"
sed -n '/--- FICHIERS/,/^$/p' "$BEFORE" | grep ':' | grep -v '---' | while IFS= read -r line; do
  bucket=$(echo "$line" | cut -d: -f1)
  count=$(echo "$line" | cut -d: -f2)
  [[ "$bucket" == paul-* ]] && continue
  [ -z "$count" ] && continue
  newcount=$(psql "$DB_URL" -t -c "SELECT count(*) FROM storage.objects WHERE bucket_id='$bucket';" 2>/dev/null | tr -d ' ')
  if [ "$newcount" -lt "$count" ] 2>/dev/null; then
    echo "   ❌ FICHIERS SUPPRIMÉS: $bucket ($count → $newcount)"; FAIL=1
  fi
done

echo ""
if [ $FAIL -eq 0 ]; then
  echo "✅ INTÉGRITÉ CONFIRMÉE — Aucune ressource existante modifiée"
else
  echo "🛑 ANOMALIES DÉTECTÉES — Voir ci-dessus"
  exit 1
fi