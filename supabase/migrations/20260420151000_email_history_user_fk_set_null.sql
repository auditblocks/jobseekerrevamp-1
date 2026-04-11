-- Keep email history after user deletion.
-- user_id becomes nullable and FK is changed to ON DELETE SET NULL.
ALTER TABLE public.email_history
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.email_history
  DROP CONSTRAINT IF EXISTS email_history_user_id_fkey;

ALTER TABLE public.email_history
  ADD CONSTRAINT email_history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
