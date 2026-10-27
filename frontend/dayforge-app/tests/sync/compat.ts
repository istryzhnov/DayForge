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
import { verifyClientsAndBilling, verifyProjectBilling, verifyMoneyTab } from './compat/billing'
import { verifyBudgetPlanIncome } from './compat/budget'
import { verifyProjectProgress, verifyProjectPanelStats } from './compat/projects'
import { verifyHabitUnification, verifyHabitStrip } from './compat/habits'
import { verifyPushReminderParity, verifyTimerReminders, verifyTimerHistoryLabels } from './compat/timer'
import { verifyCalendarTitles } from './compat/calendar'

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

  console.log(`\n${tally.checks - tally.failures}/${tally.checks} compat checks passed`)
  if (tally.failures > 0) {
    console.log(`${tally.failures} FAILED`)
    process.exitCode = 1
  }
}

main()
