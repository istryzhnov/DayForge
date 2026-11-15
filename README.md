# DayForge

DayForge is a local-first planner and time tracker. Projects hold tasks and subtasks; tasks can
repeat, be scheduled on a calendar or moved across a board; a timer records the time spent and
turns it into analytics, budgets and client billing. It works fully offline in the browser, and
syncs across devices when you sign in.

- **Projects and tasks**: nested tasks, priorities (major / minor), notes, a per-project theme,
  icon, hourly rate and budget. Projects can be active, paused or archived.
- **Scheduling**: open tasks carry forward until done; planned tasks sit on one date; recurring
  tasks follow daily / weekly / monthly / yearly / custom rules. Each day gets its own row, so
  history stays as it was when a template changes later.
- **Views**: project list or Kanban board, day / week / month calendar with time blocking,
  planned tasks, and an archive of what was done.
- **Timer**: stopwatch, countdown and Pomodoro; reminders for long runs and away time; time
  entries can be edited afterwards.
- **Analytics and billing**: time per day and project, habits, plan vs actual, earnings, an
  income goal, clients, monthly invoices and exports.
- **Everything else**: quick add with natural dates ("tomorrow 9:00"), global search, keyboard
  shortcuts, a guided tour, six interface languages (en, uk, pl, de, es, zh), themes, backups,
  and optional push reminders when the app is closed.

## Tech stack

| Area      | Choice                                                                        |
| --------- | ----------------------------------------------------------------------------- |
| UI        | Vue 3 (Composition API, `<script setup>`), TypeScript, plain CSS              |
| Build     | Vite 8 (Rolldown), `vue-tsc` type checking                                    |
| i18n      | vue-i18n, one JSON file per language and namespace                            |
| Sync      | Supabase (Postgres + Row Level Security, Realtime, Google sign-in)            |
| Reminders | Web Push via a Supabase Edge Function on a `pg_cron` schedule                 |
| Errors    | Sentry, production only, opt-in by DSN, scrubbed of personal data             |
| Tests     | Vitest + happy-dom (unit, architecture, smoke); a plain-node harness for sync |
| Hosting   | Netlify (static build); a Dockerfile for local development                    |

## System requirements

| Browser             | Minimum version |
| ------------------- | --------------- |
| Chrome, Edge        | 111             |
| Firefox             | 114             |
| Safari (macOS, iOS) | 16.4            |

These are the build targets (Vite's "baseline widely available"). Older browsers may load the
app but are not tested.

- **Offline use** needs a browser with service workers; data stays in `localStorage`, and
  pre-merge snapshots use IndexedDB.
- **Push reminders while the app is closed** need the Push API and notifications. On iPhone and
  iPad they work only when DayForge is added to the Home Screen (iOS 16.4 or later); the app
  explains this in settings.
- **Sync** needs a Supabase project and a Google account; without them the app works fully
  offline.

## Quick start

Requirements: Node.js 22 and npm.

```bash
cd frontend/dayforge-app
npm ci
npm run dev
```

Open http://localhost:5173. Without any environment variables the app runs fully locally:
data lives in the browser's storage, and the profile panel says that sync is not set up.

To try sync, copy `.env.example` to `.env.local`, fill in `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`, and set up the database as described in
[supabase/README.md](supabase/README.md).

With Docker instead of a local Node:

```bash
docker compose up
```

## Scripts

Run from `frontend/dayforge-app`.

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                  |
| `npm run build`        | Type check (`vue-tsc -b`) and production build into `dist/` |
| `npm run preview`      | Serve the production build locally                          |
| `npm test`             | Unit tests (Vitest)                                         |
| `npm run verify:sync`  | Sync engine and cross-device rules, in plain node           |
| `npm run lint`         | ESLint, including the import boundaries between layers      |
| `npm run format:check` | Prettier check (`npm run format` fixes)                     |

CI (`.github/workflows/ci.yml`) runs lint, format check, build, tests and `verify:sync` on every
pull request.

## Repository layout

```
.
├── frontend/dayforge-app/     the web app
│   ├── src/
│   │   ├── pages/             app shell (MainPage) and page-level wiring
│   │   ├── features/<name>/   one folder per feature: components, composables, index.ts
│   │   ├── shared/            UI pieces and composables used by several features
│   │   ├── entities/          domain types and constants
│   │   ├── sync/              offline-first sync engine (no Vue)
│   │   ├── lib/               storage, Supabase client, error reporting
│   │   ├── i18n/              translations
│   │   └── styles/            global CSS
│   ├── public/                static files: landing page, privacy, service worker, headers
│   └── tests/                 unit/ (Vitest) and sync/ (node harness)
├── supabase/                  database schema, migrations, Edge Function
└── .github/workflows/         CI
```

## Reporting problems

Open an [issue](https://github.com/istryzhnov/DayForge/issues) with the steps to reproduce,
what you expected and what happened, the browser and device, and whether you were signed in.
Do not attach exported backups or sync logs: they contain your data. Describe their shape
instead. For a security issue, do not open a public issue: contact the maintainer privately through
their GitHub profile.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): how the app is built: layers, data model, local-first
  storage, sync, security.
- [frontend/dayforge-app/README-structure.md](frontend/dayforge-app/README-structure.md):
  folder and import rules, and where a new file goes.
- [CONTRIBUTING.md](CONTRIBUTING.md): setup, conventions, checks, and how to add a feature, a
  translation, a setting or a synced table.
- [supabase/README.md](supabase/README.md): setting up the backend and push reminders.
- [CHANGELOG.md](CHANGELOG.md): what changed, by month.
