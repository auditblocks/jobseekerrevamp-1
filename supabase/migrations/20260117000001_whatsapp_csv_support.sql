-- Make user_id nullable in whatsapp_campaign_recipients
alter table public.whatsapp_campaign_recipients alter column user_id drop not null;

-- Add recipient_name column to whatsapp_campaign_recipients
alter table public.whatsapp_campaign_recipients add column recipient_name text;

-- Add constraint to ensure either user_id OR phone_number is present (phone_number is already NOT NULL)
-- Ideally, if user_id is NULL, recipient_name should probably be present, but let's keep it flexible.
