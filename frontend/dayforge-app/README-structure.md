# Project structure

The frontend app is organised by feature, with the shared domain logic kept apart from the UI.

## Main folders (under `src/`)

- `pages` - the app shell `MainPage.vue` and its page-level orchestration in `pages/composables`
  (`useMainPageState`). This is the composition root: it may use any feature directly.
- `features/<name>` - one folder per feature, each with its own `components` and `composables`
  (goals, tasks, board, calendar, timer, analytics, settings, sidebar, onboarding, search, …)
  and, when other features use it, an `index.ts` public API.
- `shared/ui` - generic UI building blocks used by several features (`AppIcon`, `ProjectIcon`,
  `DisclosureSection`, `DragGhost`, `UndoToast`)
- `shared/composables` - logic shared across features: the goal space (`useGoalSpace`,
  `goalSpace/*`), timer, theme, settings, billing rules, app navigation state
  (`useSettingsPanel`, `useMobileNav`), sync glue and the user-action bus (`userActions`)
- `sync` - the offline-first sync engine (diff, merge, outbox, transport); no Vue in the rules
- `entities` - domain models, shared types and constants
- `lib` - storage, Supabase client, error reporting
- `i18n` - message catalogues

## Layers and who may import whom

```
pages  ->  features  ->  shared  ->  entities, lib, i18n, sync
```

- **Shared layers** (`shared/`, `entities/`, `sync/`, `lib/`, `i18n/`) never import from
  `features/` or `pages/`. If a shared piece starts to need a feature, move it into that feature.
- **Features** never import from `pages/`. Data comes down as props.
- **A feature uses another feature only through its public API**: `import { TaskList } from
'../../tasks'`, which is `features/tasks/index.ts`. Every other file of a feature is internal
  and may change without notice. The index only re-exports, and only what another feature
  actually imports; when you need something new, export it there.
- **Features never depend on each other in a circle.** Today the order is
  `analytics -> settings -> goals -> board -> tasks -> timer`, with `sidebar`, `hotkeys` and
  `calendar` on top and `onboarding`, `profile`, `sync`, `timer` depending on no other feature.
  If two features need each other, the shared piece belongs in `shared/`.
- ESLint enforces the static imports as you type. `tests/unit/architecture.test.ts` checks the
  same rules on the whole graph, including `import()` and circles.

Feature index files are marked side-effect-free for the bundler (see `vite.config.ts`), so
importing one piece of a feature does not pull the rest of it into the first chunk.

## Where does a new file go?

- By default, into `features/<name>/components` or `features/<name>/composables` of the
  feature it belongs to, even if only `MainPage` renders it (e.g. `TimerAwayDialog` lives in
  `features/timer`).
- Into `shared/ui` or `shared/composables` only when **both** are true: at least two features
  use it, and it does not belong to one of them (`ProjectIcon`, budget rules, which panel is
  open).
- There is no top-level `src/components` or `src/composables` folder; please do not bring them
  back.

## Reporting what the user did

Code that sees a user action reports it with `reportUserAction('timer-started', { taskId })`
from `shared/composables/userActions`. It does not know who listens. The getting-started tour
subscribes once, when `useTour` loads, and moves a step when the action matches. This keeps the
timer, hotkeys and other features free of the onboarding feature.

- Add a new action to the `UserAction` type, report it where it happens, and point a tour step's
  `doneOn` at it.
- The tour must stay in the startup import graph (MainPage renders `TourCoach`), or it would miss
  actions that happen before its chunk loads; `architecture.test.ts` checks this.
- Only the tour bubble's own buttons (`next`, `step-skipped`) call `tourEvent` directly.

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

## Tests

- `tests/unit` (Vitest, `npm test`): the goal space, the folder rules (`architecture`), the
  user-action bus and the tour wiring, the bundler plugin, and a smoke test that mounts the app
  and opens every screen.
- `tests/sync` (plain node, `npm run verify:sync`): rules that must agree across devices.

## Why this structure

This layout makes it easier to:

- find feature-specific code quickly,
- keep UI and state responsibilities separated,
- change a feature's internals without breaking the others,
- scale the project without a single large components folder.
