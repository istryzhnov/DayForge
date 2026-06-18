# DayForge App

This project models goals, reusable task templates, daily snapshots, tags, and day progress.

## Data Model

```mermaid
erDiagram
	GOAL {
		string id
		string userId
		string title
		string description
		string status
		string createdAt
		string updatedAt
	}

	USER_TAG {
		string id
		string userId
		string name
		string color
		string createdAt
	}

	TASK_TEMPLATE {
		string id
		string goalId
		string title
		string notes
		string priority
		string parentTemplateId
		number order
		string[] tagIds
		string recurrence
		boolean isActive
		string createdAt
		string updatedAt
	}

	DAILY_TASK {
		string id
		string date
		string goalId
		string templateId
		string title
		string priority
		string parentDailyTaskId
		string[] tagIds
		string status
		string completedAt
	}

	DAILY_PROGRESS {
		string date
		string goalId
		number totalMinor
		number completedMinor
		number completionPercent
	}

	RECURRENCE_RULE {
		string type
		number interval
		number[] daysOfWeek
		number[] daysOfMonth
		string startDate
		string endDate
	}

	GOAL ||--o{ TASK_TEMPLATE : has
	GOAL ||--o{ DAILY_TASK : has
	GOAL ||--o{ DAILY_PROGRESS : aggregates
	USER_TAG ||--o{ TASK_TEMPLATE : labels
	USER_TAG ||--o{ DAILY_TASK : labels
	TASK_TEMPLATE ||--o{ DAILY_TASK : snapshot_of
	TASK_TEMPLATE ||--o{ TASK_TEMPLATE : parent_of
	DAILY_TASK ||--o{ DAILY_TASK : parent_of
	TASK_TEMPLATE }o--|| RECURRENCE_RULE : uses
```

## Notes

- `daily_tasks` is a snapshot, so history stays stable even if templates change later.
- `parentTemplateId` and `parentDailyTaskId` preserve the major/minor hierarchy.
- `dailyProgress` can be stored as a cache or computed on demand.
