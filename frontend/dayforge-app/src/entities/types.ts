import type { GOAL_STATUS, PRIORITY, TASK_STATUS } from './constants'

export type ID = string
export type ISODate = string
export type ISODateTime = string
export type TimeOfDay = string // hh:mm

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY]
export type GoalStatus = (typeof GOAL_STATUS)[keyof typeof GOAL_STATUS]
export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]
