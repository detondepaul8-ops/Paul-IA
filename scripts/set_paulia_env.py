#!/usr/bin/env python3
"""Configure les variables d'environnement du projet Vercel paul-ia UNIQUEMENT.
Les valeurs proviennent de /tmp/vp/celtiis.env (même DB, mêmes crédits IA).
Aucune valeur n'est affichée."""
import json
import os
import urllib.request

VERCEL_TOKEN = os.environ["VERCEL_TOKEN"]  # fourni via scripts/secrets.local.env (gitignored)
TEAM = "team_FXNfg1xIzx7cM2Dp7LTNVxOR"
PROJECT = "paul-ia"

def read_env(path, key):
    for line in open(path):
        line = line.strip()
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip('"')
    raise KeyError(key)

def force_public_schema(url):
    """Remplace le paramètre schema=<x> par schema=public (tables paul_ dans public)."""
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
    u = urlparse(url)
    q = parse_qs(u.query, keep_blank_values=True)
    q["schema"] = ["public"]
    return urlunparse(u._replace(query=urlencode(q, doseq=True)))

src = "/tmp/vp/celtiis.env"

public_key = read_env(src, "ZAI_PUBLIC_API_KEY")
public_model = read_env(src, "ZAI_PUBLIC_MODEL")

# L'API publique api.z.ai est joignable depuis Vercel (internal-api.z.ai ne
# l'est pas). Config minimale: baseUrl + apiKey uniquement.
zai_config = json.dumps({"baseUrl": "https://api.z.ai/api/paas/v4", "apiKey": public_key})

envs = [
    {"key": "DATABASE_URL", "value": force_public_schema(read_env(src, "DATABASE_URL")),
     "type": "encrypted", "target": ["production", "preview", "development"]},
    {"key": "DIRECT_URL", "value": force_public_schema(read_env(src, "DIRECT_URL")),
     "type": "encrypted", "target": ["production", "preview", "development"]},
    {"key": "ZAI_CONFIG_JSON", "value": zai_config,
     "type": "encrypted", "target": ["production", "preview", "development"]},
    {"key": "ZAI_MODEL", "value": public_model,
     "type": "plain", "target": ["production", "preview", "development"]},
    {"key": "ZAI_IMAGE_MODEL", "value": "cogview-4-250304",
     "type": "plain", "target": ["production", "preview", "development"]},
    {"key": "NEXT_PUBLIC_SUPABASE_URL",
     "value": "https://gwnkzgcgdegvcridhoby.supabase.co",
     "type": "plain", "target": ["production", "preview", "development"]},
]

url = f"https://api.vercel.com/v10/projects/{PROJECT}/env?teamId={TEAM}&upsert=true"
req = urllib.request.Request(url, data=json.dumps(envs).encode(),
                             headers={"Authorization": f"Bearer {VERCEL_TOKEN}",
                                      "Content-Type": "application/json"},
                             method="POST")
with urllib.request.urlopen(req, timeout=30) as resp:
    body = json.load(resp)

created = body.get("created", [])
errors = body.get("error", None)
print("✅ Variables créées/mises à jour:", [e.get("key") for e in created])
if errors:
    print("⚠️ erreur:", errors)

# Vérification lecture seule: noms présents sur ce projet uniquement
req2 = urllib.request.Request(
    f"https://api.vercel.com/v9/projects/{PROJECT}/env?teamId={TEAM}",
    headers={"Authorization": f"Bearer {VERCEL_TOKEN}"})
with urllib.request.urlopen(req2, timeout=30) as resp:
    listing = json.load(resp)
names = sorted(e.get("key") for e in (listing.get("envs") or listing.get("env") or []))
print("Env actuelles sur paul-ia:", names)
