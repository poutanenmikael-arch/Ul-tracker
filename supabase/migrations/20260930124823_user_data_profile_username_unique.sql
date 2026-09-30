ALTER TABLE public.user_data
  ADD CONSTRAINT user_data_profile_username_format_check
  CHECK (
    profile_json->>'username' IS NULL
    OR profile_json->>'username' ~ '^[a-z0-9_]{3,20}$'
  );

CREATE UNIQUE INDEX user_data_profile_username_ci_uidx
  ON public.user_data (lower(btrim(profile_json->>'username')))
  WHERE profile_json->>'username' IS NOT NULL;
