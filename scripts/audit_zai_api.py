#!/usr/bin/env python3
"""AUDIT TECHNIQUE RÉEL — API Z AI pour PAUL IA (Phase 1).
Teste, avec la clé serveur du compte PAUL IA :
  1. Génération d'image (cogview-4, $0.01/image) → téléchargement + vérification
  2. Génération vidéo (cogvideox-3, $0.2/vidéo) → verdict exact (crédits/dispo)
  3. Classification : gratuit-illimité / gratuit-quotas / payant / indisponible
N'affiche JAMAIS la clé. Les preuves sont enregistrées dans download/audit/.
"""
import json, os, sys, time, urllib.request, urllib.error, pathlib

CFG = json.loads(os.environ.get('ZAI_CONFIG_JSON', '{}'))
BASE = (CFG.get('baseUrl') or 'https://api.z.ai').rstrip('/')
KEY = CFG.get('apiKey') or CFG.get('token') or ''
if not KEY:
    print('ERREUR: ZAI_CONFIG_JSON absent ou sans apiKey'); sys.exit(1)
OUT = pathlib.Path('/home/z/my-project/download/audit'); OUT.mkdir(parents=True, exist_ok=True)

def call(path, payload, timeout=90):
    req = urllib.request.Request(
        f'{BASE}{path}',
        data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {KEY}'},
        method='POST')
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode()
            return r.status, json.loads(body), round(time.time() - t0, 1)
    except urllib.error.HTTPError as e:
        try: body = json.loads(e.read().decode())
        except Exception: body = {}
        return e.code, body, round(time.time() - t0, 1)

def download(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': 'paul-ia-audit'})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, 'wb') as f:
        f.write(r.read())
    return dest

print('=' * 62)
print('TEST 1 — GÉNÉRATION D\'IMAGE (cogview-4)')
print('=' * 62)
st, data, dt = call('/api/paas/v4/images/generations',
                    {'model': 'cogview-4', 'prompt':
                     'Photographie professionnelle d\'un pied-à-terre moderne au bord du lac Nokoué, Cotonou, lumière dorée, haute qualité',
                     'size': '1024x1024'})
print(f'HTTP {st} en {dt}s')
img_url = None
if st == 200:
    item = (data.get('data') or [{}])[0]
    img_url = item.get('url')
    print('modèle:', data.get('model', 'cogview-4'), '| créé:', data.get('created'))
    print('URL image:', (img_url or '')[:120])
else:
    print('code erreur:', data.get('error', {}).get('code'), '-', data.get('error', {}).get('message', '')[:200])

img_result = {'http': st, 'seconds': dt, 'url': img_url}
if img_url:
    try:
        dest = download(img_url, OUT / 'zai_cogview4_test.jpg')
        size = dest.stat().st_size
        head = open(dest, 'rb').read(16)
        fmt = 'JPEG' if head[:2] == b'\xff\xd8' else 'PNG' if head[:4] == b'\x89PNG' else head[:8].hex()
        img_result.update({'saved': str(dest), 'bytes': size, 'format': fmt})
        print(f'FICHIER VÉRIFIÉ: {dest} — {size} octets — format {fmt}')
    except Exception as e:
        img_result['download_error'] = str(e)
        print('téléchargement échoué:', e)

print()
print('=' * 62)
print('TEST 2 — GÉNÉRATION VIDÉO (cogvideox-3)')
print('=' * 62)
st, data, dt = call('/api/paas/v4/videos/generations',
                    {'model': 'cogvideox-3', 'prompt': 'un oiseau coloré vole lentement au-dessus d\'une forêt verdoyante, caméra suivante',
                     'quality': 'speed', 'size': '1280x720', 'fps': 30, 'duration': 5}, timeout=60)
print(f'HTTP {st} en {dt}s')
err = data.get('error', {})
if st in (200, 201):
    print('tâche acceptée, id:', data.get('id'))
    vid_result = {'http': st, 'task_id': data.get('id'), 'accepted': True}
else:
    print('code:', err.get('code'), '| message:', err.get('message', '')[:200])
    vid_result = {'http': st, 'code': err.get('code'), 'message': err.get('message', '')[:200], 'accepted': False}

print()
print('=' * 62)
print('SYNTHÈSE TECHNIQUE')
print('=' * 62)
print(json.dumps({'image': img_result, 'video': vid_result}, ensure_ascii=False, indent=2))
