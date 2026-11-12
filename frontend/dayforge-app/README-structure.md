# Project structure

The frontend app is organised by feature, with the shared domain logic kept apart from the UI.

## Main folders (under `src/`)

- `views` - top-level page components (`MainPage.vue` is the app shell)
- `pages/composables` - page-level orchestration (`useMainPageState`)
- `features/<name>` - one folder per feature, each with its own `components` and `composables`
  (goals, tasks, board, calendar, timer, analytics, settings, sidebar, onboarding, search, …)
- `composables` - logic shared across features: the goal space (`useGoalSpace`, `goalSpace/*`),
  timer, theme, settings, sync glue
- `sync` - the offline-first sync engine (diff, merge, outbox, transport); no Vue in the rules
- `entities` - domain models, shared types and constants
- `components` - small UI pieces used by several features
- `lib` - storage, Supabase client, error reporting
- `i18n` - message catalogues

## Composition approach

- Presentational components stay small and focus on rendering.
- State and behaviour live in composables under the matching feature folder.
- Rules that have to hold on every device (recurrence, merge, board, billing) are plain
  functions without Vue, so `tests/sync` can check them with plain node.

## How data and actions flow

- **Data goes down as props.** `MainPage` owns the goal space and hands each view what it shows.
- **Events are for what the parent itself reacts to**: open, close, select, focus. A component
  emits to its direct parent; an event is not relayed through several levels.
- **Changes to a task go through `useTaskActions()`**
  (`features/tasks/composables/useTaskActions.ts`). `useMainPageState` provides the actions once;
  a task row, a board card or the move dialog injects them and calls `actions.remove(id)` itself.
  The components in between (`GoalComponent`, `TaskList`) do not declare or re-emit them.
- App-wide singletons (`useSettings`, `useTimer`, `useSettingsPanel`, `useToday`) are imported
  directly where they are needed.

When adding a new task action: add it to the `TaskActions` interface, wire it in
`useMainPageState`, and call it from the component that triggers it.

## Why this structure

This layout makes it easier to:

- find feature-specific code quickly,
- keep UI and state responsibilities separated,
- scale the project without a single large components folder.
