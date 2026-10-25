-- DayForge sync schema.
--
-- Run this once, whole, in the Supabase SQL editor. It is written to be safe to
-- run again: every statement either creates something only if it is missing or
-- replaces it outright.
--
-- Shape: one table per kind of row, each holding the app's own object as jsonb.
-- The app's shapes change often, and the merge rules live on the client, so
-- columns per field would mean a migration for every new setting. The columns
-- that do exist are an index and a clock, nothing more.
--
--   id          the client-generated id. Day rows use `templateId::date`.
--   user_id     the owner. Every policy below turns on this one column.
--   data        the row as the app holds it, including its own `updatedAt`.
--   updated_at  set by the database, never by a client. The pull cursor reads
--               only this: a device whose clock runs behind could otherwise
--               write rows that no other device would ever pull again.

-- 1. The clock -------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_synced_at()
returns trigger
language plpgsql
as $$
begin
  new.synced_at = now();
  return new;
end;
$$;

create or replace function public.keep_newest_row()
returns trigger
language plpgsql
as $$
declare
  incoming timestamptz := nullif(new.data ->> 'updatedAt', '')::timestamptz;
  held timestamptz;
begin
  if incoming is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    held := nullif(old.data ->> 'updatedAt', '')::timestamptz;
    if held is not null and incoming < held then
      return null;
    end if;
  end if;

  if exists (
    select 1
    from public.deletions d
    where d.user_id = new.user_id
      and d.table_name = tg_table_name
      and d.row_id = new.id
      and d.deleted_at > incoming
  ) then
    return null;
  end if;

  return new;
end;
$$;

-- 2. The row tables --------------------------------------------------------

-- They are identical, so they are built from one description rather than
-- copied four times and left to drift apart.
do $$
declare
  target text;
begin
  for target in
    select unnest(array['goals', 'task_templates', 'daily_tasks', 'time_entries', 'settings', 'active_timer'])
  loop
    execute format($fmt$
      create table if not exists public.%I (
        id         text        not null,
        user_id    uuid        not null references auth.users (id) on delete cascade,
        data       jsonb       not null,
        updated_at timestamptz not null default now(),
        primary key (user_id, id)
      );
    $fmt$, target);

    -- The one query the pull makes: this account's rows, newest last.
    execute format(
      'create index if not exists %I on public.%I (user_id, updated_at);',
      target || '_user_updated_idx',
      target
    );

    execute format('alter table public.%I enable row level security;', target);

    -- Replaced rather than created, so re-running cannot fail on a duplicate.
    execute format('drop policy if exists own_rows on public.%I;', target);
    execute format($fmt$
      create policy own_rows on public.%I
        for all
        to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $fmt$, target);

    execute format(
      'grant select, insert, update, delete on public.%I to authenticated;',
      target
    );

    execute format('drop trigger if exists keep_newest_row on public.%I;', target);
    execute format($fmt$
      create trigger keep_newest_row
        before insert or update on public.%I
        for each row execute function public.keep_newest_row();
    $fmt$, target);

    execute format('drop trigger if exists touch_updated_at on public.%I;', target);
    execute format($fmt$
      create trigger touch_updated_at
        before insert or update on public.%I
        for each row execute function public.touch_updated_at();
    $fmt$, target);
  end loop;
end;
$$;

-- 3. Deletions -------------------------------------------------------------

-- A row's absence says nothing: a device that has been offline for a week
-- cannot tell a deletion from a row it has not been sent yet. So deletions are
-- recorded, and swept by the client after thirty days.
--
--   deleted_at  the deleting device's own clock. The merge weighs it against a
--               row's `updatedAt`, which is also a device's clock, so these two
--               have to be measured the same way.
--   synced_at   the database's clock, for the pull cursor. Same reasoning as
--               `updated_at` above.
create table if not exists public.deletions (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  table_name text        not null,
  row_id     text        not null,
  deleted_at timestamptz not null,
  synced_at  timestamptz not null default now(),
  primary key (user_id, table_name, row_id),
  constraint deletions_table_name_known check (
    table_name in ('goals', 'task_templates', 'daily_tasks', 'time_entries', 'settings', 'active_timer')
  )
);

alter table public.deletions drop constraint if exists deletions_table_name_known;
alter table public.deletions add constraint deletions_table_name_known check (
  table_name in ('goals', 'task_templates', 'daily_tasks', 'time_entries', 'settings', 'active_timer')
);

grant select, insert, update, delete on public.deletions to authenticated;

create index if not exists deletions_user_synced_idx
  on public.deletions (user_id, synced_at);

alter table public.deletions enable row level security;

drop policy if exists own_rows on public.deletions;
create policy own_rows on public.deletions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists touch_synced_at on public.deletions;
create trigger touch_synced_at
  before insert or update on public.deletions
  for each row execute function public.touch_synced_at();

-- 4. Housekeeping ----------------------------------------------------------

-- The client sweeps its own copy after thirty days; this keeps the server's
-- side of the record from growing for ever too. Call it from a scheduled job if
-- you ever want to, or leave it alone — it is small either way.
create or replace function public.sweep_old_deletions(older_than interval default interval '90 days')
returns integer
language plpgsql
security invoker
as $$
declare
  removed integer;
begin
  delete from public.deletions
  where user_id = auth.uid()
    and synced_at < now() - older_than;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- 5. Live updates ----------------------------------------------------------

do $$
declare
  target text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  for target in
    select unnest(array['goals', 'task_templates', 'daily_tasks', 'time_entries', 'settings', 'active_timer', 'deletions'])
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', target);
    end if;
  end loop;
end;
$$;

-- 6. Account deletion ------------------------------------------------------

-- Called by the app's "Delete account" button. The account is always the
-- caller's own (auth.uid()); nothing is passed in, so nobody can name another
-- account here.
--
-- Every table is cleared explicitly rather than left to the cascade, so the
-- list of what gets erased is visible in one place. Each table's foreign key
-- to auth.users is `on delete cascade`, so the final delete is not blocked by
-- anything; if a table is ever added without a cascade, its rows must be added
-- to the list below or the account delete will fail on that foreign key.
--
-- The same statements live in supabase/migrations/2026-10-25-delete-account.sql
-- for running on their own.
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

-- 7. Web Push reminders ----------------------------------------------------

-- One row per browser or installed app that turned "Notify me when the app is
-- closed" on. The endpoint is the push service's own address for that
-- browser, so it is unique. Written by the signed-in user from the app; read
-- and pruned by the push-reminders Edge Function with the service role.
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

-- What has already been pushed, so each reminder goes out once. `kind` is one
-- of 'long-run', 'planned-start', 'end-of-day'; `ref` is that kind's dedupe key
-- (see supabase/functions/push-reminders/rules.ts). Service role only: no
-- policy and no grant for signed-in users, so the app cannot read it.
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
