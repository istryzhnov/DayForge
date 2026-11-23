/**
 * The capsule's second line, as in the mockup: "DayForge · $45 / h · +$31.70".
 * Empty parts are dropped, so the project part is omitted without a project and
 * the money parts only appear when a rate applies.
 */
export function capsuleMeta(parts: {
  projectName?: string
  rateLabel?: string
  earnedLabel?: string
}): string {
  return [parts.projectName, parts.rateLabel, parts.earnedLabel]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
}
