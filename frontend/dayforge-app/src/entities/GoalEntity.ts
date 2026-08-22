import type { GoalStatus, ID, ISODateTime } from './types'

/**
 * A project's own colours. Only `accent` is required for a project to look
 * themed — borders, surfaces, circles and check marks are derived from it (see
 * `composables/theme/goalTheme.ts`); the rest of the fields are hand overrides
 * for people who want to place each colour themselves.
 */
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
  /**
   * @deprecated Superseded by `theme`. Still read on load so goals coloured
   * before per-project theming existed keep their colour.
   */
  accentColor?: string
}
