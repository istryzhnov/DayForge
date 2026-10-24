import type { GoalStatus, ID, ISODateTime } from './types'

export interface GoalTheme {
  accent?: string
  /** Project rows and their circles. Defaults to a near-complement of accent. */
  major?: string
  /** Ordinary task circles. Defaults to the accent itself. */
  minor?: string
  line?: string
  surface?: string
  /** 0–1: how far the colour bleeds into panels and frames. */
  intensity?: number
}

export interface Goal {
  id: ID
  title: string
  description?: string
  status: GoalStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
  /** Full per-project palette overriding the global theme inside its panel. */
  theme?: GoalTheme
  accentColor?: string
  /** What an hour on this project is worth; falls back to the global rate. */
  hourlyRate?: number
  /** The client this project is billed to. Absent means no client. */
  clientId?: ID
  /** Id from the built-in project icon set; absent means no icon. */
  icon?: string
  /** Shows the List / Board switch on this project. Absent means off. */
  boardEnabled?: boolean
  /** Free-text pad for the whole project. Absent means no notes. */
  notes?: string
  /** Analytics-only figures; never touches time entries. Absent means none. */
  billing?: { fixedPrice?: number; manualHours?: number; note?: string }
  /** Spend limit: tracked hours and/or earnings. Absent means no budget. */
  budget?: { hours?: number; amount?: number; period: 'total' | 'month' }
  /** Set only on a buried copy; a project in the live list never carries it. */
  deletedAt?: ISODateTime
}
