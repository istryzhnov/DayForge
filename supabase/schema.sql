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
