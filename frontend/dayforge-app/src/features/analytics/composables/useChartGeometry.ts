import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import {
  buildBarChart,
  type SeriesPoint,
} from '../../../composables/analytics/charts'

const FALLBACK_WIDTH = 520

/** The element a chart measures itself against; it must carry no padding. */
export const CHART_BOX_REF = 'chartBox'

/**
 * Charts are drawn at the real pixel width of their box rather than scaled up
 * from a fixed viewBox, so labels stay the same size on a narrow screen.
 */
function useMeasuredWidth() {
  const box = useTemplateRef<HTMLElement>(CHART_BOX_REF)
  const width = ref(FALLBACK_WIDTH)
  let observer: ResizeObserver | undefined

  function measure() {
    const measured = Math.round(box.value?.clientWidth ?? 0)
    if (measured > 0) width.value = measured
  }

  onMounted(() => {
    measure()
    if (box.value) {
      observer = new ResizeObserver(measure)
      observer.observe(box.value)
    }
    window.addEventListener('resize', measure)
  })

  onUnmounted(() => {
    observer?.disconnect()
    window.removeEventListener('resize', measure)
  })

  return width
}

export function useBarChartGeometry(getPoints: () => SeriesPoint[]) {
  const width = useMeasuredWidth()

  return {
    chart: computed(() => buildBarChart(getPoints(), { width: width.value })),
  }
}
