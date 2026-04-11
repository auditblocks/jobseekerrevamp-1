-- Keep subscription history after user deletion.
-- user_id becomes nullable and FK is changed to ON DELETE SET NULL.
ALTER TABLE public.subscription_history
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.subscription_history
  DROP CONSTRAINT IF EXISTS subscription_history_user_id_fkey;

ALTER TABLE public.subscription_history
  ADD CONSTRAINT subscription_history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
