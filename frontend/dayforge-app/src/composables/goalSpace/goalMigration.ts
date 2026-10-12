import type { Goal } from '../../entities/GoalEntity'
import { GOAL_STATUS } from '../../entities/constants'

/** Goals coloured before per-project theming existed stored a bare hex. */
export function migrateGoals(list: Goal[]) {
  list.forEach((goal) => {
    if (goal.accentColor && !goal.theme) {
      goal.theme = { accent: goal.accentColor }
    }
    delete goal.accentColor
    if (typeof goal.status !== 'string') {
      goal.status = GOAL_STATUS.ACTIVE
    }
  })
}
