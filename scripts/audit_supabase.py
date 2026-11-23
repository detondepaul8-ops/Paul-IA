#!/usr/bin/env python3
"""Audit Supabase vivant en lecture seule : schémas, tables paul_, colonnes
celtiis pertinentes, RLS, buckets, compteurs de lignes. Aucune écriture."""
import json, os
import psycopg2

REF = os.environ["SUPABASE_PROJECT_REF"]
PW = os.environ["SUPABASE_DB_PASSWORD"]
HOSTS = [("aws-0-eu-west-1.pooler.supabase.com", 6543, f"postgres.{REF}"),
         ("aws-0-eu-west-1.pooler.supabase.com", 5432, f"postgres.{REF}"),
         (f"db.{REF}.supabase.co", 5432, "postgres")]

def connect():
    last = None
    for host, port, user in HOSTS:
        try:
            return psycopg2.connect(host=host, port=port, user=user, password=PW,
                                    dbname="postgres", sslmode="require", connect_timeout=10)
        except Exception as e:
            last = e
    raise last

conn = connect()
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()
out = {}

cur.execute("""SELECT nspname FROM pg_namespace
               WHERE nspname NOT LIKE 'pg_%' ORDER BY 1""")
out["schemas"] = [r[0] for r in cur.fetchall()]

cur.execute("""SELECT table_schema, table_name FROM information_schema.tables
               WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 2""")
public_tables = [r for r in cur.fetchall()]
out["public_tables"] = [t for _, t in public_tables]

# Compteurs de lignes des tables paul_ (estimation exacte par COUNT)
out["row_counts"] = {}
for schema, table in public_tables:
    if table.startswith("paul_") or table in ("User", "AIProvider", "CreditTransaction", "ProviderErrorLog", "QueryLog", "Subscription"):
        cur.execute(f'SELECT COUNT(*) FROM "{schema}"."{table}"')
        out["row_counts"][f"{schema}.{table}"] = cur.fetchone()[0]

# Colonnes des tables celtiis pertinentes pour le moteur IA
out["celtiis_ai_columns"] = {}
for table in ("ai_conversations", "ai_messages", "file_analyses", "imported_files", "app_settings"):
    cur.execute("""SELECT column_name, data_type FROM information_schema.columns
                   WHERE table_schema='celtiis' AND table_name=%s ORDER BY ordinal_position""", (table,))
    out["celtiis_ai_columns"][table] = [f"{c}:{t}" for c, t in cur.fetchall()]

# Politiques RLS sur les tables paul_
cur.execute("""SELECT tablename, policyname, cmd, roles FROM pg_policies
               WHERE schemaname='public' AND tablename LIKE 'paul_%' ORDER BY 1,2""")
out["paul_rls_policies"] = [f"{r[0]}/{r[1]}[{r[2]}]" for r in cur.fetchall()]

# Buckets de stockage
cur.execute("SELECT id, public FROM storage.buckets ORDER BY 1")
out["buckets"] = [{"id": r[0], "public": r[1]} for r in cur.fetchall()]

conn.close()
os.makedirs("/home/z/my-project/scripts/audit", exist_ok=True)
with open("/home/z/my-project/scripts/audit/supabase_live.json", "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
print(json.dumps(out, indent=1, ensure_ascii=False)[:3500])
