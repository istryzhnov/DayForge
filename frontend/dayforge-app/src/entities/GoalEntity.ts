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
}
