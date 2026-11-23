#!/usr/bin/env python3
"""Audit Vercel en lecture seule : projets, cible pia-chat/paul-ia, domaines,
déploiements récents, noms de variables d'environnement (jamais les valeurs)."""
import json, os, urllib.request

TOK = os.environ["VERCEL_TOKEN"]

def api(path):
    req = urllib.request.Request("https://api.vercel.com" + path,
                                 headers={"Authorization": "Bearer " + TOK})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)

out = {}

# Projets de l'équipe du token (une seule passe, sans doublon)
data = api("/v9/projects?limit=100")
projects_all = data.get("projects", [])
out["projects"] = [{"name": p.get("name"), "framework": p.get("framework"),
                    "id": p.get("id"), "updatedAt": p.get("updatedAt")} for p in projects_all]
print("PROJETS:", [p["name"] for p in out["projects"]])

target = next((p for p in projects_all if "pia-chat" in (p.get("name") or "").lower()), None)
if target is None:
    target = next((p for p in projects_all if (p.get("name") or "").lower() == "paul-ia"), None)
print("CIBLE:", target.get("name") if target else "AUCUNE")

if target:
    name, pid = target["name"], target["id"]
    dom = api(f"/v9/projects/{name}/domains?limit=100")
    out["domains"] = [{"name": d.get("name"), "verified": d.get("verified"),
                       "redirect": d.get("redirect")} for d in dom.get("domains", [])]
    deps = api(f"/v6/deployments?projectId={pid}&limit=6")
    out["recent_deployments"] = [{"url": d.get("url"), "state": d.get("state"),
                                  "target": d.get("target"), "created": d.get("createdAt")}
                                 for d in deps.get("deployments", [])]
    env = api(f"/v9/projects/{name}/env?limit=100")
    out["env_keys"] = [{"key": e.get("key"), "target": e.get("target"), "type": e.get("type")}
                       for e in env.get("envs", [])]

os.makedirs("/home/z/my-project/scripts/audit", exist_ok=True)
with open("/home/z/my-project/scripts/audit/vercel.json", "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in out.items() if k != "projects"}, indent=1, ensure_ascii=False))
