#!/usr/bin/env python3
"""Exécute supabase/setup.sql (non-destructif, additif) puis vérifie les tables paul_.
NE touche AUCUNE table existante."""
import sys
import os
import psycopg2

REF = "gwnkzgcgdegvcridhoby"
PASSWORD = os.environ["SUPABASE_DB_PASSWORD"]  # fourni via scripts/secrets.local.env (gitignored)
HOST = "aws-0-eu-west-1.pooler.supabase.com"
USER = f"postgres.{REF}"
SQL_PATH = "/home/z/my-project/supabase/setup.sql"

sql = open(SQL_PATH).read()
conn = psycopg2.connect(host=HOST, port=6543, user=USER, password=PASSWORD,
                        dbname="postgres", sslmode="require", connect_timeout=10)
conn.autocommit = False
cur = conn.cursor()
try:
    cur.execute(sql)
    conn.commit()
    print("✅ setup.sql exécuté et commité (une seule transaction atomique)")
except Exception as e:
    conn.rollback()
    print("❌ ERREUR — rollback complet, rien n'a été modifié:")
    print(str(e)[:500])
    sys.exit(1)

# Vérification additive
cur.execute("""
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('paul_conversations','paul_messages')
    ORDER BY table_name, ordinal_position""")
print("\n== Colonnes tables paul_ ==")
for r in cur.fetchall():
    print(f"  {r[0]}.{r[1]}: {r[2]} ({'NULL' if r[3]=='YES' else 'NOT NULL'})")

cur.execute("SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id='paul-media'")
b = cur.fetchone()
print(f"\n✅ Bucket: {b}")

cur.execute("SELECT policyname, tablename FROM pg_policies WHERE tablename LIKE 'paul%' OR policyname LIKE 'paul%' ORDER BY tablename, policyname")
print("\n== Politiques paul_ ==")
for r in cur.fetchall():
    print(f"  {r[1]}: {r[0]}")

# Confirmation: tables existantes toujours là
cur.execute("SELECT count(*) FROM public.\"User\"")
print(f"\n✅ Table User existante intacte ({cur.fetchone()[0]} lignes)")
cur.execute("SELECT count(*) FROM public.\"AIProvider\"")
print(f"✅ Table AIProvider existante intacte ({cur.fetchone()[0]} lignes)")
cur.close(); conn.close()
