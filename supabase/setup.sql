-- ════════════════════════════════════════════════════════════════════
-- Paul IA — Supabase Database Setup (VERSION NON-DESTRUCTIVE)
-- ════════════════════════════════════════════════════════════════════
-- GARANTIES :
--   ✅ Aucune table existante modifiée ou supprimée
--   ✅ Aucune donnée existante touchée
--   ✅ Aucune politique RLS existante modifiée
--   ✅ Toutes les opérations sont ADDITIVES et préfixées "paul_"
--   ✅ Idempotent : peut être exécuté plusieurs fois sans effet de bord
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Conversations Paul IA (table propre, préfixée)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paul_conversations (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title      TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  module     TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- 2. Messages Paul IA
-- ─────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────
-- 3. Index (noms préfixés, IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_paul_messages_conversation_id
  ON paul_messages(conversation_id);

-- ─────────────────────────────────────────────────────────────────
-- 4. RLS sur les tables Paul IA UNIQUEMENT
--    (n'active/désactive RLS sur AUCUNE autre table)
-- ─────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────
-- 5. Politiques RLS — UNIQUEMENT sur les tables paul_
--    (noms uniques préfixés, création protégée par exception)
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paul_conversations' AND policyname = 'paul_all_conversations') THEN
    CREATE POLICY "paul_all_conversations" ON paul_conversations
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'paul_messages' AND policyname = 'paul_all_messages') THEN
    CREATE POLICY "paul_all_messages" ON paul_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 6. Fonction trigger (nom préfixé, jamais remplacée si elle existe déjà)
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'paul_update_updated_at' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'CREATE FUNCTION paul_update_updated_at()
RETURNS TRIGGER AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;';
  END IF;
END $$;

-- Trigger sur notre table uniquement (drop ciblé sur NOTRE table = sans risque)
DROP TRIGGER IF EXISTS paul_conv_updated_at ON paul_conversations;
CREATE TRIGGER paul_conv_updated_at
  BEFORE UPDATE ON paul_conversations
  FOR EACH ROW EXECUTE FUNCTION paul_update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 7. Bucket de stockage "paul-media"
--    (ON CONFLICT DO NOTHING : ne modifie JAMAIS un bucket existant)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'paul-media',
  'paul-media',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 8. Politiques storage — noms uniques "paul_*", scoped au bucket
--    paul-media uniquement. Aucune politique existante n'est modifiée.
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'paul_media_public_read') THEN
    CREATE POLICY "paul_media_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'paul-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'paul_media_insert') THEN
    CREATE POLICY "paul_media_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'paul-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'paul_media_delete') THEN
    CREATE POLICY "paul_media_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'paul-media');
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- FIN — Vérification : les commandes de contrôle sont dans
-- scripts/verify-supabase.sh
-- ════════════════════════════════════════════════════════════════════