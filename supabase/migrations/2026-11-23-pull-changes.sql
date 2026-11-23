-- DayForge: one-call pull (run once, on its own, in the Supabase SQL editor).
--
-- Adds public.pull_changes(), which the app uses to fetch everything that
-- changed since its cursor in one request instead of seven. It is the same
-- function as section 8 of supabase/schema.sql, so running schema.sql also
-- includes it. Needs the sync tables from schema.sql. Safe to run more than
-- once.
--
-- Until it is run the app keeps working: it notices the function is missing
-- and pulls table by table as before.

create or replace function public.pull_changes(since timestamptz, max_rows integer default 1000)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target text;
  part jsonb;
  tables jsonb := '{}'::jsonb;
  removed jsonb;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- No cursor means everything; `> null` would quietly mean nothing.
  since := coalesce(since, '-infinity'::timestamptz);

  -- One more than asked for, so the caller can tell "exactly full" from "more".
  foreach target in array array['goals', 'task_templates', 'daily_tasks', 'time_entries', 'settings', 'active_timer']
  loop
    execute format($fmt$
      select coalesce(
        jsonb_agg(
          jsonb_build_object('id', page.id, 'updated_at', page.updated_at, 'data', page.data)
          order by page.updated_at, page.id
        ),
        '[]'::jsonb
      )
      from (
        select id, updated_at, data
        from public.%I
        where user_id = $1 and updated_at > $2
        order by updated_at, id
        limit $3
      ) page
    $fmt$, target)
    into part
    using me, since, max_rows + 1;

    tables := tables || jsonb_build_object(target, part);
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table_name', page.table_name,
        'row_id', page.row_id,
        'deleted_at', page.deleted_at,
        'synced_at', page.synced_at
      )
      order by page.synced_at, page.table_name, page.row_id
    ),
    '[]'::jsonb
  )
  into removed
  from (
    select table_name, row_id, deleted_at, synced_at
    from public.deletions
    where user_id = me and synced_at > since
    order by synced_at, table_name, row_id
    limit max_rows + 1
  ) page;

  return jsonb_build_object('tables', tables, 'deletions', removed);
end;
$$;

revoke all on function public.pull_changes(timestamptz, integer) from public, anon;
grant execute on function public.pull_changes(timestamptz, integer) to authenticated;
