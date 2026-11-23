#!/bin/bash
# ════════════════════════════════════════════════════════════════════
# TESTS OBLIGATOIRES PAUL IA — serveur réel local + SQLite de test
#   Test 1 : création d'une IMAGE (texte → image)
#   Test 2 : création d'une VIDÉO (texte → vidéo)
#   Test 3 : transformation IMAGE → VIDÉO
# Vérifie : fichiers réels produits (JPEG/MP4), messages honnêtes
# (jamais « assistant textuel uniquement »), affichage dans la conversation.
# ════════════════════════════════════════════════════════════════════
set -e
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=3100
BASE="http://127.0.0.1:$PORT"
rm -f /tmp/paul-test.db

echo "── Préparation : schéma + client Prisma SQLite ──"
python3 scripts/make_test_schema.py
npx prisma generate --schema prisma/schema.test.sqlite.prisma 2>&1 | tail -1
npx prisma db push --schema prisma/schema.test.sqlite.prisma --skip-generate 2>&1 | tail -1

echo "── Démarrage du serveur Next réel (port $PORT) ──"
npx next start -p $PORT > /tmp/paul-test-server.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null; npx prisma generate 2>&1 | tail -1' EXIT

for i in $(seq 1 30); do
  sleep 1
  curl -s --max-time 3 "$BASE/api/route" >/dev/null 2>&1 && break || true
done
echo "serveur prêt"

JSON(){ python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
print(json.dumps({k:d.get(k) for k in sys.argv[2:] if k in d}, ensure_ascii=False)[:400])" "$@"; }

verify_no_textual(){ python3 -c "
import json,sys
raw=open(sys.argv[1]).read()
bad=[w for w in ('textuel uniquement','ne peux pas générer de vidéos','ne peux pas générer d\'images','assistant textuel') if w.lower() in raw.lower()]
print('  message interdit:', 'ABSENT ✓' if not bad else f'PRÉSENT ✗ {bad}')" "$1"; }

# ── TEST 1 : IMAGE ──────────────────────────────────────────────────
echo ""
echo "══ TEST 1 : création d'une IMAGE (texte → image) ══"
T0=$(date +%s)
curl -s --max-time 120 -X POST "$BASE/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"génère une image : un oiseau coloré aux ailes bleues et rouges posé sur une branche, forêt verdoyante en arrière-plan, photographie professionnelle"}' \
  > /tmp/t1.json
T1=$(( $(date +%s) - T0 ))
JSON /tmp/t1.json module mediaType mediaUrl
echo "  durée: ${T1}s"
verify_no_textual /tmp/t1.json
IMG_URL=$(python3 -c "import json; print(json.load(open('/tmp/t1.json')).get('mediaUrl') or '')")
if [ -n "$IMG_URL" ]; then
  curl -s --max-time 30 "$BASE$IMG_URL" -o /tmp/t1.img
  python3 -c "
data=open('/tmp/t1.img','rb').read()
kind='JPEG' if data[:2]==b'\xff\xd8' else ('PNG' if data[:4]==b'\x89PNG' else data[:4])
print(f'  fichier réel: {len(data)//1024} Ko, type {kind}', '✓ IMAGE RÉELLE' if len(data)>10000 else '✗ FICHIER INVALIDE')"
else echo "  ✗ aucune image produite"; fi

# ── TEST 2 : VIDÉO texte→vidéo ─────────────────────────────────────
echo ""
echo "══ TEST 2 : création d'une VIDÉO (texte → vidéo) ══"
T0=$(date +%s)
curl -s --max-time 180 -X POST "$BASE/api/chat" -H "Content-Type: application/json" \
  -d '{"message":"crée une vidéo : un oiseau coloré vole au-dessus d une forêt verdoyante, caméra suivante"}' \
  > /tmp/t2.json
T2=$(( $(date +%s) - T0 ))
JSON /tmp/t2.json module mediaType mediaUrl
echo "  durée: ${T2}s"
verify_no_textual /tmp/t2.json
VID_URL=$(python3 -c "import json; print(json.load(open('/tmp/t2.json')).get('mediaUrl') or '')")
if [ -n "$VID_URL" ]; then
  curl -s --max-time 30 "$BASE$VID_URL" -o /tmp/t2.mp4
  python3 -c "
data=open('/tmp/t2.mp4','rb').read()
print(f'  fichier réel: {len(data)//1024} Ko, conteneur {data[4:8]}', '✓ VIDÉO MP4 RÉELLE' if data[4:8]==b'ftyp' and len(data)>50000 else '✗ FICHIER INVALIDE')"
  ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/t2.mp4 2>/dev/null | sed 's/^/  durée vidéo: /s' || true
else echo "  ✗ aucune vidéo produite — cause:"; python3 -c "
import json; d=json.load(open('/tmp/t2.json'))
print(' ', (d.get('content') or '')[:300])"; fi

# ── TEST 3 : IMAGE → VIDÉO ─────────────────────────────────────────
echo ""
echo "══ TEST 3 : transformation IMAGE → VIDÉO ══"
python3 -c "
import base64, json
data = open('/tmp/t1.img','rb').read()
print('image source du test 3:', len(data)//1024, 'Ko (celle du test 1)')
json.dump({'message':'anime cette image : transforme cette image en vidéo avec un mouvement de caméra','images':[{'mime':'image/jpeg','dataBase64':base64.b64encode(data).decode()}]}, open('/tmp/t3_payload.json','w'))"
T0=$(date +%s)
curl -s --max-time 180 -X POST "$BASE/api/chat" -H "Content-Type: application/json" \
  --data-binary @/tmp/t3_payload.json > /tmp/t3.json
T3=$(( $(date +%s) - T0 ))
JSON /tmp/t3.json module mediaType mediaUrl
echo "  durée: ${T3}s"
verify_no_textual /tmp/t3.json
V3_URL=$(python3 -c "import json; print(json.load(open('/tmp/t3.json')).get('mediaUrl') or '')")
if [ -n "$V3_URL" ]; then
  curl -s --max-time 30 "$BASE$V3_URL" -o /tmp/t3.mp4
  python3 -c "
data=open('/tmp/t3.mp4','rb').read()
print(f'  fichier réel: {len(data)//1024} Ko, conteneur {data[4:8]}', '✓ VIDÉO MP4 RÉELLE DEPUIS IMAGE' if data[4:8]==b'ftyp' and len(data)>50000 else '✗ FICHIER INVALIDE')"
  ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/t3.mp4 2>/dev/null | sed 's/^/  durée vidéo: /s' || true
else echo "  ✗ aucune vidéo produite — cause:"; python3 -c "
import json; d=json.load(open('/tmp/t3.json'))
print(' ', (d.get('content') or '')[:300])"; fi

echo ""
echo "══ SYNTHÈSE ══"
echo "  Test 1 (image)      : voir lignes ci-dessus"
echo "  Test 2 (texte→vidéo): voir lignes ci-dessus"
echo "  Test 3 (image→vidéo): voir lignes ci-dessus"
echo "  Serveur: $BASE (logs: /tmp/paul-test-server.log)"
