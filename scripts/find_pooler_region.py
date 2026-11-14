#!/usr/bin/env python3
"""Découvre la région du pooler Supabase et teste la connexion DB.
NE MODIFIE RIEN — lecture seule (SELECT 1)."""
import sys
import psycopg2

REF = "gwnkzgcgdegvcridhoby"
PASSWORD = "REDACTED_SUPABASE_DB_PASSWORD"
USER = f"postgres.{REF}"
DB = "postgres"

REGIONS = [
    "eu-west-3", "eu-west-2", "eu-west-1", "eu-central-1", "eu-central-2",
    "eu-north-1", "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-south-1", "sa-east-1",
]

def try_region(region, port):
    host = f"aws-0-{region}.pooler.supabase.com"
    try:
        conn = psycopg2.connect(
            host=host, port=port, user=USER, password=PASSWORD,
            dbname=DB, sslmode="require", connect_timeout=5,
        )
        cur = conn.cursor()
        cur.execute("SELECT current_database(), current_user, version()")
        row = cur.fetchone()
        cur.close(); conn.close()
        return row
    except Exception as e:
        msg = str(e).replace("\n", " ")[:120]
        return None, f"{type(e).__name__}: {msg}"

for region in REGIONS:
    for port in (6543, 5432):
        res = try_region(region, port)
        if res and res[0]:
            print(f"✅ SUCCÈS region={region} port={port} -> db={res[0]} user={res[1]}")
            print(f"   version: {res[2][:80]}")
            print(f"POOLER_REGION={region}")
            sys.exit(0)
        else:
            print(f"   {region}:{port} -> {res[1] if len(res) > 1 else res}")
print("❌ Aucune région trouvée")
sys.exit(1)
