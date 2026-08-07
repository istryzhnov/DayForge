# Project structure

The frontend app uses a feature-based structure to keep the codebase easier to scan and maintain.

## Main folders

- features/goals - goal panel and goal-related UI
- features/tasks - task composer, task list, task-related state
- features/sidebar - sidebar navigation and goal creation UI
- features/goal-space - shared goal-space state, task tree, persistence helpers
- pages - page-level state orchestration
- entities - domain models and shared types
- views - top-level page components

## Composition approach

- Presentational components stay small and focus on rendering.
- State and behavior live in composables under the matching feature folder.
- Page-level orchestration uses composables in the pages folder.
- Shared business logic for task and goal space is kept under features/goal-space.

## Why this structure

This layout makes it easier to:

- find feature-specific code quickly,
- keep UI and state responsibilities separated,
- scale the project without a single large components folder.

--
