-- ════════════════════════════════════════════════════════════════════
-- Paul IA — Supabase Database Setup
-- Tables préfixées "paul_" pour cohabiter avec Factory IA
-- ════════════════════════════════════════════════════════════════════

-- 1. Conversations
CREATE TABLE IF NOT EXISTS paul_conversations (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title      TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  module     TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Messages
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

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_paul_messages_conversation_id ON paul_messages(conversation_id);

-- 4. RLS (Row Level Security)
ALTER TABLE paul_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE paul_messages ENABLE ROW LEVEL SECURITY;

-- Permissive policies for now (auth can be added later)
CREATE POLICY "Allow all on paul_conversations" ON paul_conversations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on paul_messages" ON paul_messages
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION paul_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS paul_conv_updated_at ON paul_conversations;
CREATE TRIGGER paul_conv_updated_at
  BEFORE UPDATE ON paul_conversations
  FOR EACH ROW EXECUTE FUNCTION paul_update_updated_at();

-- 6. Storage bucket for media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'paul-media',
  'paul-media',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for paul-media bucket
CREATE POLICY "Public read on paul-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'paul-media');

CREATE POLICY "Authenticated insert on paul-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'paul-media');

CREATE POLICY "Authenticated delete on paul-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'paul-media');