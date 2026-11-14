#!/usr/bin/env python3
"""Instantané read-only de l'état de la DB Supabase (tables, RLS, buckets).
Usage: python3 snapshot_db.py before|after|diff  — ne modifie RIEN."""
import sys, json, os
import psycopg2

REF = "gwnkzgcgdegvcridhoby"
PASSWORD = "REDACTED_SUPABASE_DB_PASSWORD"
HOST = f"aws-0-eu-west-1.pooler.supabase.com"
USER = f"postgres.{REF}"
SNAP_DIR = "/home/z/my-project/scripts/snapshots"

def connect(port=6543):
    return psycopg2.connect(host=HOST, port=port, user=USER, password=PASSWORD,
                            dbname="postgres", sslmode="require", connect_timeout=10)

def snapshot():
    conn = connect()
    cur = conn.cursor()
    out = {}
    cur.execute("""
        SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog','information_schema')
        ORDER BY 1,2""")
    out["tables"] = [{"schema": r[0], "table": r[1], "rls": r[2]} for r in cur.fetchall()]
    cur.execute("SELECT schemaname, tablename, policyname FROM pg_policies ORDER BY 1,2,3")
    out["policies"] = [{"schema": r[0], "table": r[1], "policy": r[2]} for r in cur.fetchall()]
    try:
        cur.execute("SELECT id, name, public FROM storage.buckets ORDER BY 1")
        out["buckets"] = [{"id": r[0], "name": r[1], "public": r[2]} for r in cur.fetchall()]
    except Exception as e:
        out["buckets"] = f"erreur: {e}"
    # nb de lignes des tables du schéma public (hors paul_)
    out["row_counts"] = {}
    for t in out["tables"]:
        if t["schema"] == "public":
            try:
                cur.execute(f'SELECT count(*) FROM "{t["schema"]}"."{t["table"]}"')
                out["row_counts"][f'{t["schema"]}.{t["table"]}'] = cur.fetchone()[0]
            except Exception as e:
                out["row_counts"][f'{t["schema"]}.{t["table"]}'] = f"erreur: {str(e)[:80]}"
    cur.execute("SELECT DISTINCT n.nspname FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' ORDER BY 1")
    out["schemas"] = [r[0] for r in cur.fetchall()]
    cur.execute("""
        SELECT event_object_schema, event_object_table, trigger_name
        FROM information_schema.triggers ORDER BY 1,2,3""")
    out["triggers"] = [{"schema": r[0], "table": r[1], "trigger": r[2]} for r in cur.fetchall()]
    cur.close(); conn.close()
    return out

def load(name):
    with open(os.path.join(SNAP_DIR, f"{name}.json")) as f:
        return json.load(f)

mode = sys.argv[1] if len(sys.argv) > 1 else "before"
os.makedirs(SNAP_DIR, exist_ok=True)

if mode in ("before", "after"):
    data = snapshot()
    with open(os.path.join(SNAP_DIR, f"{mode}.json"), "w") as f:
        json.dump(data, f, indent=2, default=str)
    print(f"Instantané '{mode}' sauvegardé.")
    print("Schemas:", data["schemas"])
    print(f"Tables: {len(data['tables'])} | Politiques: {len(data['policies'])} | Buckets: {len(data['buckets']) if isinstance(data['buckets'], list) else data['buckets']}")
    pub = [t for t in data["tables"] if t["schema"] == "public"]
    print("Tables public:", [t["table"] for t in pub])
    if isinstance(data["buckets"], list):
        print("Buckets:", [b["id"] for b in data["buckets"]])
    print("Nb lignes (public):", data["row_counts"])

elif mode == "diff":
    b, a = load("before"), load("after")
    bt = {(t["schema"], t["table"]) for t in b["tables"]}
    at = {(t["schema"], t["table"]) for t in a["tables"]}
    bp = {(p["schema"], p["table"], p["policy"]) for p in b["policies"]}
    ap = {(p["schema"], p["table"], p["policy"]) for p in a["policies"]}
    bb = {x["id"] for x in b["buckets"]} if isinstance(b["buckets"], list) else set()
    ab = {x["id"] for x in a["buckets"]} if isinstance(a["buckets"], list) else set()
    print("== Tables AJOUTÉES ==", sorted(at - bt) or "(aucune)")
    print("== Tables SUPPRIMÉES ==", sorted(bt - at) or "(aucune)")
    print("== Politiques AJOUTÉES ==", sorted(ap - bp) or "(aucune)")
    print("== Politiques SUPPRIMÉES ==", sorted(bp - ap) or "(aucune)")
    print("== Buckets AJOUTÉS ==", sorted(ab - bb) or "(aucun)")
    print("== Buckets SUPPRIMÉS ==", sorted(bb - ab) or "(aucun)")
    dr = {k: v for k, v in b["row_counts"].items() if k in a["row_counts"] and b["row_counts"][k] != a["row_counts"][k]}
    print("== Nb lignes MODIFIÉS (tables existantes) ==", dr or "(aucun — données intactes)")
    # RLS flag changes sur tables préexistantes
    rls_b = {f"{t['schema']}.{t['table']}": t["rls"] for t in b["tables"]}
    rls_a = {f"{t['schema']}.{t['table']}": t["rls"] for t in a["tables"]}
    rls_changes = {k: (rls_b[k], rls_a[k]) for k in rls_b if k in rls_a and rls_b[k] != rls_a[k]}
    print("== RLS modifié sur tables existantes ==", rls_changes or "(aucun)")
