-- Google account authentication for the existing sangbogi records.
-- Apply only after the Google provider and redirect URLs are configured in Supabase Auth.

ALTER TABLE public.sangbogi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sangbogi open" ON public.sangbogi;
DROP POLICY IF EXISTS "sangbogi_google_allowlist" ON public.sangbogi;

REVOKE ALL ON TABLE public.sangbogi FROM anon;
REVOKE ALL ON TABLE public.sangbogi FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sangbogi TO authenticated;

CREATE POLICY "sangbogi_google_allowlist"
ON public.sangbogi
FOR ALL
TO authenticated
USING (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'phlogos1@gmail.com'
  AND coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
)
WITH CHECK (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'phlogos1@gmail.com'
  AND coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
);
