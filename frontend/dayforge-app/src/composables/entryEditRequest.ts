import { ref } from 'vue'
import type { TimeEntry } from '../entities/TimerEntity'

/**
 * A request from anywhere in the app to open the entry editor on one entry.
 * MainPage mounts the editor while a request is pending, so it works from any view.
 */
const request = ref<TimeEntry | null>(null)

export function requestEntryEdit(entry: TimeEntry) {
  request.value = entry
}

export function useEntryEditRequest() {
  return {
    editRequest: request,
    closeEntryEdit: () => {
      request.value = null
    },
  }
}
