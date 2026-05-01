-- List people attributed to the current user as referrer (SECURITY DEFINER reads referee profile for display only).

CREATE OR REPLACE FUNCTION public.referral_my_invitees()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'display_name',
          COALESCE(NULLIF(trim(p.name), ''), 'Invited user'),
          'signed_up_at', a.created_at,
          'signed_up', true,
          'subscribed',
            EXISTS (
              SELECT 1
              FROM public.referral_events e
              WHERE e.referee_user_id = a.referee_user_id
                AND e.referrer_user_id = a.referrer_user_id
                AND e.event_type = 'qualified_payment'
            )
            OR COALESCE(p.subscription_tier, 'FREE') IN ('PRO', 'PRO_MAX'),
          'subscription_tier', COALESCE(p.subscription_tier, 'FREE')
        )
        ORDER BY a.created_at DESC
      )
      FROM public.referral_attributions a
      LEFT JOIN public.profiles p ON p.id = a.referee_user_id
      WHERE a.referrer_user_id = auth.uid()
    ),
    '[]'::jsonb
  );
$$;

GRANT EXECUTE ON FUNCTION public.referral_my_invitees() TO authenticated;
