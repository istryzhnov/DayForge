import { computed } from 'vue'
import { useSettings } from './useSettings'
import {
  MODULE_IDS,
  MODULE_PRESETS,
  isModuleOn,
  matchingPreset,
  presetModules,
  type ModuleId,
  type ModulePreset,
} from './moduleCatalog'

/**
 * The user's optional modules. Turning one off only hides it: its data stays
 * where it is and comes back with the module.
 */
export function useModules() {
  const { settings, update } = useSettings()

  /** Whether a module is on, including its requirement (clients needs earnings). */
  function isOn(id: ModuleId): boolean {
    return isModuleOn(settings.modules, id)
  }

  function setModule(id: ModuleId, on: boolean) {
    update('modules', { [id]: on })
  }

  function applyPreset(preset: ModulePreset) {
    update('modules', presetModules(preset))
  }

  const onCount = computed(() => MODULE_IDS.filter((id) => isOn(id)).length)
  const allCount = MODULE_IDS.length

  /** The preset the current toggles match, so its button can show as chosen. */
  const activePreset = computed(() => matchingPreset(settings.modules))

  return {
    isOn,
    setModule,
    applyPreset,
    onCount,
    allCount,
    activePreset,
    presets: MODULE_PRESETS,
  }
}
