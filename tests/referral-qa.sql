-- Manual QA snippets for referral bonus (run in SQL editor against staging).
-- 1) Enable program
-- UPDATE dashboard_config SET config_value = '{"enabled": true}'::jsonb WHERE config_key = 'referral_program_enabled';

-- 2) Smoke: RPCs exist
-- SELECT public.referral_program_enabled();
-- SELECT public.effective_email_daily_cap('00000000-0000-0000-0000-000000000000'::uuid); -- expect error "not allowed" when run as non-superadmin with wrong uuid

-- 3) Queue processor (should return small integer)
-- SELECT public.referral_activate_queued_grants();

-- 4) Inspect grants
-- SELECT id, status, starts_at, expires_at, config_snapshot FROM referral_bonus_grants ORDER BY created_at DESC LIMIT 10;
