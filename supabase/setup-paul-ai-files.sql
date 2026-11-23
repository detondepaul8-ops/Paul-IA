-- PAUL IA — table paul_ai_files (additif, ne touche aucune table existante)
-- Fichiers Excel/PDF générés par l'IA : spec stocké, octets régénérés au téléchargement.
CREATE TABLE IF NOT EXISTS public.paul_ai_files (
    id         text PRIMARY KEY,
    kind       text NOT NULL CHECK (kind IN ('EXCEL', 'PDF')),
    title      text NOT NULL,
    filename   text NOT NULL,
    spec       jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS paul_ai_files_created_idx ON public.paul_ai_files (created_at DESC);

-- RLS activée, politique lecture publique par identifiant (les identifiants sont
-- des UUID non devinables ; l'app n'a pas encore de comptes utilisateurs).
ALTER TABLE public.paul_ai_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS paul_ai_files_read ON public.paul_ai_files;
CREATE POLICY paul_ai_files_read ON public.paul_ai_files
    FOR SELECT USING (true);
DROP POLICY IF EXISTS paul_ai_files_insert ON public.paul_ai_files;
CREATE POLICY paul_ai_files_insert ON public.paul_ai_files
    FOR INSERT WITH CHECK (true);

-- Déclencheur de mise à jour d'horodatage non requis (created_at fixe).
