// ════════════════════════════════════════════════════════════════════
// Setup Paul IA dans Supabase — 100% ADDITIF ET IDEMPOTENT
// Usage: node setup-supabase.js <DB_URL>
// ════════════════════════════════════════════════════════════════════
const { Client } = require('pg');

const SETUP_SQL = `
-- Tables Paul IA (préfixées, additive)
CREATE TABLE IF NOT EXISTS paul_conversations (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title      TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  module     TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paul_messages (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES paul_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  module          TEXT,
  media_url       TEXT,
  media_type      TEXT,
  media_filename  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paul_messages_conversation_id ON paul_messages(conversation_id);

-- RLS sur tables paul_ uniquement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'paul_conversations' AND n.nspname = 'public' AND c.relrowsecurity
  ) THEN
    ALTER TABLE paul_conversations ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'paul_messages' AND n.nspname = 'public' AND c.relrowsecurity
  ) THEN
    ALTER TABLE paul_messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Politiques RLS paul_ (noms uniques)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paul_conversations' AND policyname = 'paul_all_conversations') THEN
    CREATE POLICY "paul_all_conversations" ON paul_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paul_messages' AND policyname = 'paul_all_messages') THEN
    CREATE POLICY "paul_all_messages" ON paul_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Fonction trigger préfixée (jamais écrasée si elle existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'paul_update_updated_at' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE FUNCTION paul_update_updated_at() RETURNS TRIGGER AS $fn$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$ LANGUAGE plpgsql;';
  END IF;
END $$;

DROP TRIGGER IF EXISTS paul_conv_updated_at ON paul_conversations;
CREATE TRIGGER paul_conv_updated_at
  BEFORE UPDATE ON paul_conversations
  FOR EACH ROW EXECUTE FUNCTION paul_update_updated_at();
`;

const BUCKET_SQL = `
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'paul-media', 'paul-media', true, 10485760,
  ARRAY['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','audio/wav','audio/mpeg','audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='paul_media_public_read') THEN
    CREATE POLICY "paul_media_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'paul-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='paul_media_insert') THEN
    CREATE POLICY "paul_media_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'paul-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='paul_media_delete') THEN
    CREATE POLICY "paul_media_delete" ON storage.objects FOR DELETE USING (bucket_id = 'paul-media');
  END IF;
END $$;
`;

async function main() {
  const DB_URL = process.argv[2];
  if (!DB_URL) { console.error('Usage: node setup-supabase.js <DB_URL>'); process.exit(1); }

  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log('✅ Connecté à Supabase PostgreSQL');

    // Pré-flight : vérifier les tables existantes
    const existing = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'paul_%' ORDER BY tablename`
    );
    console.log(`ℹ️  Tables existantes (autres apps, non touchées): ${existing.rows.map(r => r.tablename).join(', ') || 'aucune'}`);

    // Exécuter le setup tables
    await client.query(SETUP_SQL);
    console.log('✅ Tables paul_conversations + paul_messages prêtes');

    // Vérifier les tables créées
    const created = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'paul_%'`
    );
    console.log(`   → ${created.rows.map(r => r.tablename).join(', ')}`);

    // Bucket storage (peut échouer si permissions schema storage insuffisantes)
    try {
      await client.query(BUCKET_SQL);
      const bucket = await client.query(`SELECT id, public FROM storage.buckets WHERE id='paul-media'`);
      if (bucket.rows.length > 0) {
        console.log(`✅ Bucket paul-media prêt (public: ${bucket.rows[0].public})`);
      } else {
        console.log('⚠️  Bucket non créé (à créer via dashboard: Storage → New bucket → paul-media → public)');
      }
    } catch (e) {
      console.log(`⚠️  Bucket/stockage: ${e.message}`);
      console.log('   → À créer manuellement: Dashboard → Storage → New bucket → "paul-media" → Public');
    }

    // Test insertion/suppression dans paul_conversations
    const test = await client.query(
      `INSERT INTO paul_conversations (title) VALUES ('__deploy_test__') RETURNING id`
    );
    await client.query(`DELETE FROM paul_conversations WHERE id=$1`, [test.rows[0].id]);
    console.log('✅ Test écriture/lecture OK (entrée test supprimée)');

  } finally {
    await client.end();
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });