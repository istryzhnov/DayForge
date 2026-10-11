import type { ID } from '../../entities/types'
import type { ActiveTimer } from '../../entities/TimerEntity'
import { isLive } from './machine'

/**
 * Whether a sitting running here must be stopped and recorded before another
 * device's timer replaces it. Not when the other side carries on with the same
 * sitting, nor when it is the side that closed it.
 */
export function mustRecordBeforeAdopting(
  local: ActiveTimer,
  incoming: ActiveTimer,
  remoteClosedSessionId: ID,
): boolean {
  return (
    isLive(local) &&
    incoming.sessionId !== local.sessionId &&
    remoteClosedSessionId !== local.sessionId
  )
}
