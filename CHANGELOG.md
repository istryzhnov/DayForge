# Changelog

DayForge has no numbered releases yet. Entries are grouped by the month their pull request was
merged into `main`, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Changed

- Sync polls every 5 min instead of every 30 s while the Realtime channel is live, and asks for
  all changes in one `pull_changes()` request instead of seven. Run
  `supabase/migrations/2026-11-23-pull-changes.sql` on an existing project to use it.

### Documentation

- Project guide: README, architecture, contributing, backend setup and this changelog.

## 2026-11

### Changed

- Feature folders talk to each other only through a public `index.ts`; no catch-all
  `components` or `composables` folders; the tour hears user actions through a small event bus
  ([#46](https://github.com/istryzhnov/DayForge/pull/46)).
- Task actions are provided once and injected where they are used, instead of being re-emitted
  through every level ([#45](https://github.com/istryzhnov/DayForge/pull/45)).
- Sizes in `rem`; borders, media queries and hairlines stay in `px`
  ([#40](https://github.com/istryzhnov/DayForge/pull/40)).

### Added

- Pick a starter template right in the welcome card
  ([#42](https://github.com/istryzhnov/DayForge/pull/42)).
- About page: a builder section and motion instead of a competitor comparison
  ([#43](https://github.com/istryzhnov/DayForge/pull/43)).
- Dark scrollbars, a close button in the phone menu, a project icon picked from the project
  name ([#39](https://github.com/istryzhnov/DayForge/pull/39)).

### Fixed

- Every palette has a day and a night variant; the Fresh / Minimal switch is gone
  ([#44](https://github.com/istryzhnov/DayForge/pull/44)).
- Link previews, page headings, the starter dialog backdrop, the sidebar footer on short
  screens and view titles on phones ([#41](https://github.com/istryzhnov/DayForge/pull/41)).
- Tour: +1 day note in the add step, block step in Day view, filter tip placement, timer basics
  first ([#38](https://github.com/istryzhnov/DayForge/pull/38)).
- Calendar: unschedule by drag, untimed tasks on any day, no project needed for new blocks,
  drawing blocks in week view ([#37](https://github.com/istryzhnov/DayForge/pull/37)).

## 2026-10

### Added

- The whole app in English, Ukrainian, Polish, German, Chinese and Spanish
  ([#26](https://github.com/istryzhnov/DayForge/pull/26)).
- Getting-started tour; sign-out clears the account's data
  ([#25](https://github.com/istryzhnov/DayForge/pull/25)); UI, tour and about page updates
  ([#34](https://github.com/istryzhnov/DayForge/pull/34)); the step-by-step guide folded into
  one row of Help ([#36](https://github.com/istryzhnov/DayForge/pull/36)).
- Coach-mark tips, the welcome flow and Sunset as the default theme
  ([#22](https://github.com/istryzhnov/DayForge/pull/22)).
- Accessibility: keyboard-safe dialogs, menus and drawer, visible focus everywhere
  ([#35](https://github.com/istryzhnov/DayForge/pull/35)).
- Tasks can run past midnight into the next day
  ([#32](https://github.com/istryzhnov/DayForge/pull/32)).
- Task order syncs across devices ([#28](https://github.com/istryzhnov/DayForge/pull/28)).
- Drag a project with its subtasks up and down the list
  ([#24](https://github.com/istryzhnov/DayForge/pull/24)); drag projects on touch screens
  ([#23](https://github.com/istryzhnov/DayForge/pull/23)).
- Start view and project order settings ([#21](https://github.com/istryzhnov/DayForge/pull/21)).
- Account deletion, freelancer billing, timer reminders, project budgets and an income goal
  ([#15](https://github.com/istryzhnov/DayForge/pull/15)).
- The timer
  ([#11](https://github.com/istryzhnov/DayForge/pull/11),
  [#13](https://github.com/istryzhnov/DayForge/pull/13),
  [#14](https://github.com/istryzhnov/DayForge/pull/14),
  [#16](https://github.com/istryzhnov/DayForge/pull/16)); pick the countdown length on the
  timer ([#20](https://github.com/istryzhnov/DayForge/pull/20)).
- CI with ESLint, Prettier and split compat tests
  ([#19](https://github.com/istryzhnov/DayForge/pull/19)).

### Changed

- Redesign of analytics, the shared UI and every main screen
  ([#18](https://github.com/istryzhnov/DayForge/pull/18)); settings built on the shared UI
  primitives ([#30](https://github.com/istryzhnov/DayForge/pull/30)).

### Fixed

- Sync data safety: accounts kept apart, field-level merge, midnight rollover
  ([#33](https://github.com/istryzhnov/DayForge/pull/33)).
- Delete a board card from its right-click menu
  ([#31](https://github.com/istryzhnov/DayForge/pull/31)).
- Local time units, full-length toast choices, orange as the first project colour
  ([#29](https://github.com/istryzhnov/DayForge/pull/29)).
- The timer asks about away time after a reload or sleep too
  ([#27](https://github.com/istryzhnov/DayForge/pull/27)).
- Centred add-task plus and even sidebar buttons
  ([#17](https://github.com/istryzhnov/DayForge/pull/17)).

### Documentation

- Owner details in the privacy policy and terms
  ([#12](https://github.com/istryzhnov/DayForge/pull/12)).

## 2026-08

### Added

- Calendar view with task scheduling and events
  ([#6](https://github.com/istryzhnov/DayForge/pull/6),
  [#7](https://github.com/istryzhnov/DayForge/pull/7),
  [#8](https://github.com/istryzhnov/DayForge/pull/8)), and a month view
  ([#9](https://github.com/istryzhnov/DayForge/pull/9)).
- Editing and deleting tasks, better project management
  ([#5](https://github.com/istryzhnov/DayForge/pull/5)).

### Changed

- A single source of truth for tasks and days
  ([#4](https://github.com/istryzhnov/DayForge/pull/4)).

## 2026-07

### Added

- Habits table ([#3](https://github.com/istryzhnov/DayForge/pull/3)).
- Tags ([#2](https://github.com/istryzhnov/DayForge/pull/2)).
- Daily tasks generated from templates ([#1](https://github.com/istryzhnov/DayForge/pull/1)).
