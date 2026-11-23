#!/usr/bin/env python3
"""Ajoute GROQ_API_KEY (+GROQ_MODEL) aux variables d'environnement du projet
Vercel paul-ia. La valeur provient de scripts/secrets.local.env — jamais affichée."""
import json, os, urllib.request

VERCEL_TOKEN = os.environ["VERCEL_TOKEN"]
GROQ_KEY = os.environ["GROQ_API_KEY"]
PROJECT = "paul-ia"

def req(method, path, payload=None):
    r = urllib.request.Request(
        f"https://api.vercel.com{path}",
        data=json.dumps(payload).encode() if payload else None,
        headers={"Authorization": f"Bearer {VERCEL_TOKEN}", "Content-Type": "application/json"},
        method=method)
    with urllib.request.urlopen(r, timeout=25) as resp:
        body = resp.read()
        return json.loads(body) if body else {}

for item in [
    {"key": "GROQ_API_KEY", "value": GROQ_KEY, "type": "encrypted",
     "target": ["production", "preview", "development"]},
    {"key": "GROQ_MODEL", "value": "whisper-large-v3", "type": "plain",
     "target": ["production", "preview", "development"]},
]:
    try:
        req("POST", f"/v9/projects/{PROJECT}/env?upsert=true", item)
        print(f"{item['key']} : configurée")
    except Exception as e:
        print(f"{item['key']} : ERREUR {e}")
