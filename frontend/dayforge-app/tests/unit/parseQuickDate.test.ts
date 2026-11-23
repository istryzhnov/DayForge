import { describe, expect, it } from 'vitest'
import { parseQuickDate } from '../../src/features/hotkeys/composables/parseQuickDate'

// 2026-11-17 is a Tuesday, the day the quick-add mockup shows.
const TODAY = '2026-11-17'

describe('parseQuickDate', () => {
  it('reads Ukrainian tomorrow and a 24-hour time', () => {
    const result = parseQuickDate(
      'Підготувати інвойс для клієнта завтра 9:00',
      TODAY,
    )
    expect(result.title).toBe('Підготувати інвойс для клієнта')
    expect(result.date).toBe('2026-11-18')
    expect(result.startTime).toBe('09:00')
    expect(result.day).toBe('tomorrow')
  })

  it('reads Ukrainian today without a time', () => {
    const result = parseQuickDate('Купити молоко сьогодні', TODAY)
    expect(result.title).toBe('Купити молоко')
    expect(result.date).toBe('2026-11-17')
    expect(result.startTime).toBeNull()
    expect(result.day).toBe('today')
  })

  it('reads an accusative Ukrainian weekday with a preposition-free time', () => {
    const result = parseQuickDate("Зустріч у п'ятницю о 18:30", TODAY)
    expect(result.title).toBe('Зустріч у')
    expect(result.date).toBe('2026-11-20')
    expect(result.startTime).toBe('18:30')
    expect(result.day).toBe('weekday')
  })

  it('treats the same weekday as today as a week ahead', () => {
    const result = parseQuickDate('Огляд вівторок', TODAY)
    expect(result.date).toBe('2026-11-24')
  })

  it('reads English tomorrow with am time and drops at', () => {
    const result = parseQuickDate('Call mom tomorrow at 9am', TODAY)
    expect(result.title).toBe('Call mom')
    expect(result.date).toBe('2026-11-18')
    expect(result.startTime).toBe('09:00')
  })

  it('reads English weekday names and pm times', () => {
    const result = parseQuickDate('Gym friday 6:30 pm', TODAY)
    expect(result.title).toBe('Gym')
    expect(result.date).toBe('2026-11-20')
    expect(result.startTime).toBe('18:30')
  })

  it('reads German heute and um', () => {
    const result = parseQuickDate('Bericht heute um 14:30', TODAY)
    expect(result.title).toBe('Bericht')
    expect(result.date).toBe('2026-11-17')
    expect(result.startTime).toBe('14:30')
  })

  it('reads Polish jutro and o', () => {
    const result = parseQuickDate('Zadzwonić jutro o 9:00', TODAY)
    expect(result.title).toBe('Zadzwonić')
    expect(result.date).toBe('2026-11-18')
    expect(result.startTime).toBe('09:00')
  })

  it('reads Spanish mañana with a plain and an accented spelling', () => {
    const accented = parseQuickDate('Llamar mañana a las 9:00', TODAY)
    expect(accented.title).toBe('Llamar')
    expect(accented.date).toBe('2026-11-18')
    const plain = parseQuickDate('Llamar manana', TODAY)
    expect(plain.date).toBe('2026-11-18')
  })

  it('reads Chinese day words without spaces, and 下午 as afternoon', () => {
    const tomorrow = parseQuickDate('明天买牛奶', TODAY)
    expect(tomorrow.title).toBe('买牛奶')
    expect(tomorrow.date).toBe('2026-11-18')

    const afternoon = parseQuickDate('下午3点开会', TODAY)
    expect(afternoon.startTime).toBe('15:00')
    expect(afternoon.title).toBe('开会')
  })

  it('reads a time alone as today', () => {
    const result = parseQuickDate('Дзвінок 9am', TODAY)
    expect(result.date).toBe('2026-11-17')
    expect(result.startTime).toBe('09:00')
    expect(result.day).toBeNull()
  })

  it('reads 12am as midnight and 12 pm as noon', () => {
    expect(parseQuickDate('x 12am', TODAY).startTime).toBe('00:00')
    expect(parseQuickDate('x 12 pm', TODAY).startTime).toBe('12:00')
  })

  it('leaves words that only contain a day word alone', () => {
    const result = parseQuickDate('Morgenroutine', TODAY)
    expect(result.title).toBe('Morgenroutine')
    expect(result.date).toBeNull()
  })

  it('leaves numbers that are not times, and written dates, in the title', () => {
    const result = parseQuickDate('Сплатити 25.10 і 25:00', TODAY)
    expect(result.title).toBe('Сплатити 25.10 і 25:00')
    expect(result.startTime).toBeNull()
    expect(result.date).toBeNull()
  })

  it('reads only the first day word and keeps a second one in the title', () => {
    const result = parseQuickDate('завтра купити hoy', TODAY)
    expect(result.date).toBe('2026-11-18')
    expect(result.title).toBe('купити hoy')
  })

  it('reports the ranges read as date or time words', () => {
    const input = 'Купити молоко завтра 9:00'
    const result = parseQuickDate(input, TODAY)
    expect(
      result.ranges.map(({ start, end }) => input.slice(start, end)),
    ).toEqual(['завтра', '9:00'])
  })

  it('returns the whole line as the title when nothing is recognised', () => {
    const result = parseQuickDate('  Просто задача  ', TODAY)
    expect(result).toEqual({
      title: 'Просто задача',
      date: null,
      startTime: null,
      day: null,
      ranges: [],
    })
  })
})
