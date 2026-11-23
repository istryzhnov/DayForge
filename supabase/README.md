# Supabase backend

DayForge needs a backend only for sync across devices, Google sign-in and push reminders. The
app is complete without it. Everything here is SQL and one Edge Function; there is no server of
our own.

| File                                       | Purpose                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `schema.sql`                               | the whole schema; safe to run again                  |
| `migrations/2026-10-25-delete-account.sql` | `delete_my_account()` on its own, for older projects |
| `migrations/2026-10-26-web-push.sql`       | push tables and the 5-minute schedule                |
| `migrations/2026-11-23-pull-changes.sql`   | `pull_changes()` on its own, for older projects      |
| `functions/push-reminders/index.ts`        | Edge Function that sends due reminders               |
| `functions/push-reminders/rules.ts`        | which reminders are due; the same rules as the app   |

How the tables, triggers and merge work is explained in [ARCHITECTURE.md](../ARCHITECTURE.md#sync).

## 1. Database and sync

1. Create a Supabase project.
2. Open the SQL editor and run `schema.sql` as a whole. It creates the six row tables
   (`goals`, `task_templates`, `daily_tasks`, `time_entries`, `settings`, `active_timer`), the
   `deletions` table, Row Level Security policies, triggers, Realtime publication,
   `delete_my_account()` and `pull_changes()`. Running it again is harmless.

   A project set up before `pull_changes()` existed only needs
   `migrations/2026-11-23-pull-changes.sql`. The app works without it, but then every sync
   costs seven requests instead of one.

3. Copy the project URL and the anon (public) key into `frontend/dayforge-app/.env.local`:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

   For a deployed site, set the same names in Netlify under Site settings → Environment
   variables.

## 2. Google sign-in

1. In Google Cloud, create an OAuth client (Web application) and add
   `https://<project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI.
2. In Supabase, enable Authentication → Providers → Google with that client id and secret.
3. Under Authentication → URL configuration, add every origin the app runs on (for example
   `http://localhost:5173` and the production URL) to the redirect allow list. The app sends
   users back to the page they started from.

## 3. Push reminders (optional)

Reminders for a long-running timer, a planned block that is starting and the end of the day,
delivered while the app is closed.

1. Generate VAPID keys:

   ```bash
   npx web-push generate-vapid-keys
   ```

   Put only the **public** key in the app as `VITE_VAPID_PUBLIC_KEY`. Without it the "Notify me
   when the app is closed" toggle is hidden.

2. Set the function secrets (the service role key and URL are provided by Supabase):

   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:<you> CRON_SECRET=<long random string>
   ```

3. Deploy the function. It checks `CRON_SECRET` itself, so the gateway JWT check is off:

   ```bash
   supabase functions deploy push-reminders --no-verify-jwt
   ```

4. Enable the `pg_cron` and `pg_net` extensions (Database → Extensions), store the same cron
   secret in Vault once:

   ```sql
   select vault.create_secret('<long random string>', 'cron_secret');
   ```

5. In `migrations/2026-10-26-web-push.sql`, replace `<PROJECT_REF>` and run it. Step 4 of that
   file schedules the function every five minutes. To stop it:
   `select cron.unschedule('push-reminders');`

Each reminder is sent once (`push_log`); expired subscriptions are removed automatically.

## Security model

- Every table has Row Level Security: signed-in users can only touch rows with their own
  `user_id`. The anon key alone can read nothing.
- `updated_at` and `synced_at` are set by triggers, never by clients, so a device with a wrong
  clock cannot hide rows from the pull.
- `keep_newest_row` rejects writes older than the stored row or than a recorded deletion.
- `delete_my_account()` is `security definer` but takes no arguments and only ever deletes the
  caller's rows and auth user.
- `push_log` has no policy and no grant for signed-in users; only the Edge Function reads it.
- Never commit keys. The service role key, the private VAPID key and the cron secret live only
  in Supabase secrets and Vault.

## Changing the schema

Keep `schema.sql` the complete, re-runnable description, and add each change as a new dated
file in `migrations/` for projects that already exist. A new synced table also needs client
changes; see "Add a synced table" in [CONTRIBUTING.md](../CONTRIBUTING.md).
