# Contributing

Thanks for working on DayForge. This guide covers setup, the conventions the project follows,
and step-by-step recipes for common changes. For how the app works, read
[ARCHITECTURE.md](ARCHITECTURE.md) first; for where files go,
[frontend/dayforge-app/README-structure.md](frontend/dayforge-app/README-structure.md).

## Contents

- [Setup](#setup)
- [Workflow](#workflow)
- [Checks](#checks)
- [Code conventions](#code-conventions)
- [Recipes](#recipes)
  - [Add a feature](#add-a-feature)
  - [Share a component or composable](#share-a-component-or-composable)
  - [Add a translation](#add-a-translation)
  - [Add a setting](#add-a-setting)
  - [Add a field to a synced object](#add-a-field-to-a-synced-object)
  - [Add a synced table](#add-a-synced-table)
  - [Tell the tour about a user action](#tell-the-tour-about-a-user-action)
  - [Add a task action](#add-a-task-action)
- [Tests](#tests)
- [Reporting bugs](#reporting-bugs)

## Setup

```bash
cd frontend/dayforge-app
npm ci
npm run dev
```

The app works without a backend. To work on sync, sign-in or push reminders, set up a Supabase
project ([supabase/README.md](supabase/README.md)) and put its keys in `.env.local` (see
`.env.example`). Never commit a `.env` file.

Recommended editor setup: VS Code with the Vue (Volar) extension (recommended in
`.vscode/extensions.json`), plus ESLint and Prettier integrations.

## Workflow

1. Branch from `main`: `type/short-name`, e.g. `feat/habit-streaks`, `fix/timer-away`,
   `refactor/feature-boundaries`, `docs/sync-guide`.
2. Commit with a title in the form `type(scope): what changed`, e.g.
   `fix(theme): every palette has a day and a night variant`.
   Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `style`.
3. Run the checks below.
4. Open a pull request with the same kind of title and a short description: one paragraph or a
   few bullets on what changed and why. Squash to one commit per PR unless the history matters.

## Checks

All of these run in CI on every pull request. Run them locally from `frontend/dayforge-app`
before you push:

```bash
npm run lint
```

```bash
npm run format:check
```

```bash
npm run build
```

```bash
npm test
```

```bash
npm run verify:sync
```

`npm run format` and `npm run lint:fix` fix most style issues on their own.

## Code conventions

- **TypeScript everywhere**, `<script setup lang="ts">` in components. No `any` unless a
  comment says why.
- **Composables** are named `useX` and live next to the components that use them. Pure rule
  modules (no Vue, no storage) use plain names (`recurrence.ts`, `projectBudget.ts`) so they
  can run in node.
- **Stored data is untrusted.** Anything read from storage, a backup or another device goes
  through a `sanitize…` function that accepts old shapes and drops what it cannot read.
- **Constants over strings.** Use `TASK_STATUS.DONE`, `SYNC_TABLE.GOALS`, and so on from
  `entities/constants.ts` and `sync/types.ts`.
- **Comments explain why**, not what. Public functions get a short doc comment when the name
  is not enough.
- **No user-facing strings in code.** Every label goes through `t('namespace.key')`.
- **Styles** live in `src/styles/*.css`, one file per area, with design tokens as CSS variables.
  Sizes are in `rem`; borders, hairlines and media queries stay in `px`.

## Recipes

### Add a feature

1. Create `src/features/<name>/components/` and `composables/`.
2. Render its entry component from `MainPage.vue`. Load it with `defineAsyncComponent` if it is
   not needed on the first screen.
3. If another feature needs something from it, create `features/<name>/index.ts` and export
   just that. The architecture test fails on exports nobody imports.
4. Keep the feature graph free of cycles. If two features need each other, the shared piece
   belongs in `src/shared`.

### Share a component or composable

Move it to `src/shared/ui` or `src/shared/composables` only when at least two features use it and
it does not belong to one of them. Otherwise keep it in its feature and export it from the
feature's `index.ts`.

### Add a translation

- New key: add it to `src/i18n/locales/en/<namespace>.json` and to every other language in the
  same namespace. A new namespace file is picked up automatically.
- Plurals: English uses `"one | many"`; Ukrainian and Polish need four forms
  (`zero | one | few | many`); Chinese has one. See the comment in `src/i18n/index.ts`.
- New language: add it to `LANGUAGES` (and `PLURAL_FORMS` if needed) in
  `src/i18n/languages.ts`, then add a `locales/<code>/` folder with every namespace.
- `npm run verify:sync` checks that every language has the same keys, placeholders and plural
  forms as English and that no message is empty.

### Add a setting

1. Add the field and its default to `AppSettings` / `DEFAULT_SETTINGS` in
   `src/shared/composables/useSettings.ts`.
2. Read it back safely in `sanitize()` in the same file: a missing or invalid value falls back
   to the default.
3. Settings sections sync as separate groups (`SYNCED_SECTIONS` in `settingsRow.ts`); a new
   section must be added there to sync.
4. Add the control to the matching section in `features/settings/components/`, with
   translations in `settings.json`.

### Add a field to a synced object

1. Add it to the entity in `src/entities/` and sanitize it where the object is read.
2. Put it in the right field group in `src/sync/fieldGroups.ts`, so it merges together with the
   fields it is edited with. A field in no group is stamped on its own.
3. Add a compat check in `tests/sync/compat/` if older data or another device could disagree.

### Add a synced table

1. Add the name to `SYNC_TABLE` in `src/sync/types.ts`.
2. In `supabase/schema.sql`, add it to the row-table loop, the `deletions_table_name_known`
   constraint, the Realtime list and `delete_my_account()`. Ship the same as a new file in
   `supabase/migrations/`.
3. Register the collection with the engine (`pages/composables/registerWorkspaceSync.ts`, or
   `useSync.ts` for singleton rows such as settings and the timer).
4. Cover it in `tests/sync/verify.ts`.

### Tell the tour about a user action

1. Add the action to `UserAction` in `src/shared/composables/userActions.ts`.
2. Call `reportUserAction('your-action', payload)` where it happens.
3. Point a tour step's `doneOn` at it in `features/onboarding/composables/tourSteps.ts`.

### Add a task action

Add it to the `TaskActions` interface in `features/tasks/composables/useTaskActions.ts`, wire it
in `useMainPageState`, and call it from the component that triggers it. Components in between
do not re-emit it.

## Tests

| You changed…                          | Add or update                                               |
| ------------------------------------- | ----------------------------------------------------------- |
| task, project or day behaviour        | `tests/unit/useGoalSpace.test.ts`                           |
| a rule that must agree across devices | a compat check in `tests/sync/compat/` (plain node, no DOM) |
| sync engine, outbox, merge            | `tests/sync/verify.ts`                                      |
| folders, imports, public APIs         | `tests/unit/architecture.test.ts` fails on violations       |
| a screen or its loading               | `tests/unit/appSmoke.test.ts`                               |

Tests run with a fixed time zone (UTC) and fake clocks where dates matter, so they give the
same result on every machine.

## Reporting bugs

See [Reporting problems](README.md#reporting-problems) in the README.
