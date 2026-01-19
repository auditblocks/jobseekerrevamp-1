-- Create whatsapp_campaigns table
create table public.whatsapp_campaigns (
  id uuid not null default gen_random_uuid(),
  template_name text not null,
  template_language text not null default 'en_US',
  status text not null default 'draft', -- draft, sending, completed, failed
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  scheduled_at timestamp with time zone,
  
  constraint whatsapp_campaigns_pkey primary key (id)
);

-- Create whatsapp_campaign_recipients table
create table public.whatsapp_campaign_recipients (
  id uuid not null default gen_random_uuid(),
  campaign_id uuid references public.whatsapp_campaigns(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  phone_number text not null,
  status text not null default 'pending', -- pending, sent, failed, delivered, read
  message_id text,
  error_details text,
  updated_at timestamp with time zone not null default now(),

  constraint whatsapp_campaign_recipients_pkey primary key (id)
);

-- Enable RLS
alter table public.whatsapp_campaigns enable row level security;
alter table public.whatsapp_campaign_recipients enable row level security;

-- Policies for whatsapp_campaigns
-- Policies for whatsapp_campaigns
create policy "Admins can view all whatsapp campaigns"
  on public.whatsapp_campaigns for select
  using (public.is_superadmin());

create policy "Admins can insert whatsapp campaigns"
  on public.whatsapp_campaigns for insert
  with check (public.is_superadmin());

create policy "Admins can update whatsapp campaigns"
  on public.whatsapp_campaigns for update
  using (public.is_superadmin());

create policy "Admins can delete whatsapp campaigns"
  on public.whatsapp_campaigns for delete
  using (public.is_superadmin());

-- Policies for whatsapp_campaign_recipients
create policy "Admins can view all whatsapp campaign recipients"
  on public.whatsapp_campaign_recipients for select
  using (public.is_superadmin());

create policy "Admins can insert whatsapp campaign recipients"
  on public.whatsapp_campaigns for insert
  with check (public.is_superadmin());

-- Indexes for performance
create index whatsapp_campaigns_created_at_idx on public.whatsapp_campaigns(created_at desc);
create index whatsapp_campaign_recipients_campaign_id_idx on public.whatsapp_campaign_recipients(campaign_id);
