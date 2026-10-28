/**
 * Forward compatibility: a row written by a newer build carries fields this
 * build does not know, and an older build must hand them back unchanged.
 *
 *     npm run verify:sync
 */
import { tally } from './compat/harness'
import {
  verifyAccountDeletionWipe,
  verifyRowsFromNewerBuild,
  verifyMergeKeepsUnknownFields,
  verifyRestoreKeepsUnknownFields,
  verifySettingsRow,
  verifyBackupFixture,
  verifyNewerBackup,
} from './compat/sync'
import {
  verifyUpcomingTasks,
  verifyBoardFields,
  verifyBoardPersistence,
  verifyProjectNotes,
  verifyTaskNotes,
  verifyDayLists,
} from './compat/tasks'
import {
  verifyClientsAndBilling,
  verifyProjectBilling,
  verifyMoneyTab,
} from './compat/billing'
import { verifyBudgetPlanIncome } from './compat/budget'
import {
  verifyProjectProgress,
  verifyProjectPanelStats,
} from './compat/projects'
import { verifyHabitUnification, verifyHabitStrip } from './compat/habits'
import {
  verifyPushReminderParity,
  verifyTimerReminders,
  verifyTimerHistoryLabels,
} from './compat/timer'
import { verifyCalendarTitles } from './compat/calendar'
import { verifyGoalReorder } from './compat/reorder'
import {
  verifyTourChapters,
  verifyTourDeletions,
  verifyTourGuards,
  verifyTourLifecycle,
  verifyTourPaths,
  verifyTourSteps,
  verifyTourStorage,
} from './compat/tour'
import { verifySignOutKeySelection } from './compat/signout'
import { verifyFieldGroupMerge } from './compat/fieldGroups'
import { verifyAccountSwitchWipe } from './compat/accountSwitch'
import { verifyQueuedDeletes } from './compat/queuedDeletes'
import { verifyDayBoundaries } from './compat/dayBoundaries'
import { verifyRecurrenceEdges } from './compat/recurrenceEdges'
import { verifyTranslations } from './compat/i18n'
import { verifyProjectDropTargets } from './compat/dropTargets'
import { verifyTaskOrder } from './compat/taskOrder'
import { verifyOvernightTasks } from './compat/overnight'
import {
  verifyPrimaryButtonContrast,
  verifyPresetReset,
  verifyPresetMemory,
} from './compat/theme'

function main() {
  verifyPushReminderParity()
  verifyTimerReminders()
  verifyBudgetPlanIncome()
  verifyClientsAndBilling()
  verifyUpcomingTasks()
  verifyAccountDeletionWipe()
  verifyBoardFields()
  verifyBoardPersistence()
  verifyProjectNotes()
  verifyProjectBilling()
  verifyRowsFromNewerBuild()
  verifyMergeKeepsUnknownFields()
  verifyRestoreKeepsUnknownFields()
  verifySettingsRow()
  verifyBackupFixture()
  verifyNewerBackup()
  verifyTaskNotes()
  verifyHabitUnification()
  verifyProjectProgress()
  verifyProjectPanelStats()
  verifyMoneyTab()
  verifyTimerHistoryLabels()
  verifyCalendarTitles()
  verifyDayLists()
  verifyHabitStrip()
  verifyPrimaryButtonContrast()
  verifyPresetReset()
  verifyPresetMemory()
  verifyGoalReorder()
  verifyProjectDropTargets()
  verifyTaskOrder()
  verifySignOutKeySelection()
  verifyAccountSwitchWipe()
  verifyQueuedDeletes()
  verifyDayBoundaries()
  verifyRecurrenceEdges()
  verifyTourSteps()
  verifyTourPaths()
  verifyTourGuards()
  verifyTourLifecycle()
  verifyTourDeletions()
  verifyTourStorage()
  verifyOvernightTasks()
  verifyTourChapters()
  verifyTranslations()
  verifyFieldGroupMerge()

  console.log(
    `\n${tally.checks - tally.failures}/${tally.checks} compat checks passed`,
  )
  if (tally.failures > 0) {
    console.log(`${tally.failures} FAILED`)
    process.exitCode = 1
  }
}

main()
