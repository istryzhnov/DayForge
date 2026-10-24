-- DayForge: delete account (run once, on its own, in the Supabase SQL editor).
--
-- Adds public.delete_my_account(), which the app calls from "Delete account".
-- It erases the signed-in caller's rows in every sync table and then the
-- caller's auth user. It is the same function as section 6 of
-- supabase/schema.sql, so running schema.sql also includes it. Safe to run
-- more than once.

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

  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;