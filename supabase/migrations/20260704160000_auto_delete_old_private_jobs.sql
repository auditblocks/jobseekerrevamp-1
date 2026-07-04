-- Migration to automatically delete private jobs listed (created) more than 15 days ago

CREATE OR REPLACE FUNCTION public.delete_old_private_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete private jobs older than 15 days based on creation timestamp
  DELETE FROM public.naukri_jobs
  WHERE created_at < NOW() - INTERVAL '15 days';
END;
$$;

-- Schedule the cron job to run daily at midnight
SELECT cron.schedule(
  'delete-old-private-jobs-daily',
  '0 0 * * *',
  'SELECT public.delete_old_private_jobs()'
);
