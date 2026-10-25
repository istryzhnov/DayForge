-- DayForge: Web Push reminders (run on its own, in the Supabase SQL editor).
--
-- Adds:
--   1. push_subscriptions   one row per browser/installed app with reminders on
--   2. push_log             what has been pushed already (service role only)
--   3. delete_my_account()  re-created so account deletion also clears 1 and 2
--   4. the 5-minute schedule that calls the push-reminders Edge Function
--
-- Safe to run more than once, apart from step 4, which replaces its own job.
-- The same tables and function are in supabase/schema.sql (sections 6 and 7).
--
-- Before you run it:
--   - Step 4 needs the pg_cron and pg_net extensions. Enable both under
--     Database > Extensions in the dashboard first (or uncomment the two
--     "create extension" lines in step 4 and run them as the postgres role).
--   - Replace <PROJECT_REF> in step 4 with your project ref (the part of the
--     project URL before .supabase.co).
--   - Pick a long random secret, give it to the Edge Function as CRON_SECRET
--     (supabase secrets set CRON_SECRET=...), and store the same value in
--     Vault once, under the name used in step 4:
--       select vault.create_secret('<cron secret>', 'cron_secret');
--     Do not paste the secret into this file. The service role key is not
--     used here: newer projects hand functions a different key, so a copy of
--     the old one is rejected.
--
-- Run steps 1 to 3 first. Run step 4 after the Edge Function is deployed and
-- the secrets are set (see the setup notes).

-- 1. Subscriptions ---------------------------------------------------------

create table if not exists public.push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  endpoint     text        not null unique,
  p256dh       text        not null,
  auth         text        not null,
  user_agent   text,
  timezone     text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists own_rows on public.push_subscriptions;
drop policy if exists own_select on public.push_subscriptions;
drop policy if exists own_insert on public.push_subscriptions;
drop policy if exists own_delete on public.push_subscriptions;

create policy own_select on public.push_subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

create policy own_insert on public.push_subscriptions
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy own_delete on public.push_subscriptions
  for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;

-- 2. Push log --------------------------------------------------------------

-- Service role only: no policy and no grant for signed-in users.
create table if not exists public.push_log (
  user_id uuid        not null references auth.users (id) on delete cascade,
  kind    text        not null,
  ref     text        not null,
  sent_at timestamptz not null default now(),
  constraint push_log_unique unique (user_id, kind, ref)
);

create index if not exists push_log_sent_idx on public.push_log (sent_at);

alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;

-- 3. Account deletion ------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  delete from public.goals where user_id = me;
  delete from public.task_templates where user_id = me;
  delete from public.daily_tasks where user_id = me;
  delete from public.time_entries where user_id = me;
  delete from public.settings where user_id = me;
  delete from public.active_timer where user_id = me;
  delete from public.deletions where user_id = me;
  delete from public.push_subscriptions where user_id = me;
  delete from public.push_log where user_id = me;

  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 4. Schedule: every 5 minutes -----------------------------------------------

-- Requires the pg_cron and pg_net extensions (enable them first, see above).
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;

-- Replaces the job if it exists, so re-running this step is harmless.
select cron.unschedule(jobid)
from cron.job
where jobname = 'push-reminders';

select cron.schedule(
  'push-reminders',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);

-- To stop the reminders: select cron.unschedule('push-reminders');
