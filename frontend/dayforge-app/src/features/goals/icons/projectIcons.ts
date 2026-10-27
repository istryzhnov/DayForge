export interface ProjectIconDef {
  id: string
  label: string
  /** SVG path data on a 24×24 grid, drawn with currentColor strokes. */
  paths: string[]
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`

export const PROJECT_ICONS: readonly ProjectIconDef[] = [
  { id: 'work', label: 'Work', paths: ['M3 7h18v12H3z', 'M9 7V5h6v2'] },
  { id: 'laptop', label: 'Laptop', paths: ['M5 6h14v10H5z', 'M2 19h20'] },
  {
    id: 'study',
    label: 'Study',
    paths: [
      'M2 9l10-5 10 5-10 5z',
      'M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5',
    ],
  },
  {
    id: 'book',
    label: 'Book',
    paths: [
      'M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z',
      'M12 6v13.5',
    ],
  },
  {
    id: 'write',
    label: 'Writing',
    paths: ['M4 20l4-1L19 8l-3-3L5 16z', 'M14 6l3 3'],
  },
  {
    id: 'code',
    label: 'Code',
    paths: ['M8 7l-5 5 5 5', 'M16 7l5 5-5 5', 'M14 4l-4 16'],
  },
  {
    id: 'music',
    label: 'Music',
    paths: [circle(6, 18, 3), circle(18, 16, 3), 'M9 18V5l12-2v13'],
  },
  {
    id: 'camera',
    label: 'Camera',
    paths: ['M3 8h4l2-3h6l2 3h4v11H3z', circle(12, 13, 3.5)],
  },
  {
    id: 'sport',
    label: 'Sport',
    paths: ['M6 8v8', 'M18 8v8', 'M3 10v4', 'M21 10v4', 'M6 12h12'],
  },
  {
    id: 'bike',
    label: 'Bike',
    paths: [
      circle(6, 16, 3),
      circle(18, 16, 3),
      'M6 16l4-7h6l2 7',
      'M10 9l4 7',
    ],
  },
  {
    id: 'globe',
    label: 'Travel',
    paths: [
      circle(12, 12, 9),
      'M3 12h18',
      'M12 3c-3 3.5-3 14.5 0 18',
      'M12 3c3 3.5 3 14.5 0 18',
    ],
  },
  {
    id: 'health',
    label: 'Health',
    paths: ['M3 12h4l2-4 4 8 2-4h6'],
  },
  {
    id: 'heart',
    label: 'Heart',
    paths: [
      'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
    ],
  },
  {
    id: 'money',
    label: 'Money',
    paths: [
      circle(12, 12, 9),
      'M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.8 2.5 2 2.5.6 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5',
    ],
  },
  {
    id: 'shop',
    label: 'Shopping',
    paths: ['M3 4h2l2.5 11h10L20 7H6', circle(9, 19, 1.2), circle(17, 19, 1.2)],
  },
  {
    id: 'home',
    label: 'Home',
    paths: ['M3 11l9-7 9 7', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  },
  {
    id: 'plant',
    label: 'Plant',
    paths: [
      'M12 21v-9',
      'M12 12c0-4 3-7 7-7 0 4-3 7-7 7z',
      'M12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z',
    ],
  },
  {
    id: 'star',
    label: 'Star',
    paths: [
      'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
    ],
  },
  {
    id: 'sun',
    label: 'Sun',
    paths: [
      circle(12, 12, 4),
      'M12 2v2',
      'M12 20v2',
      'M2 12h2',
      'M20 12h2',
      'M4.9 4.9l1.4 1.4',
      'M17.7 17.7l1.4 1.4',
      'M4.9 19.1l1.4-1.4',
      'M17.7 6.3l1.4-1.4',
    ],
  },
  {
    id: 'moon',
    label: 'Moon',
    paths: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'],
  },
  { id: 'flag', label: 'Flag', paths: ['M5 21V4', 'M5 4h12l-2 4 2 4H5'] },
  {
    id: 'idea',
    label: 'Idea',
    paths: [
      'M9 18h6',
      'M10 21h4',
      'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
    ],
  },
  { id: 'mail', label: 'Mail', paths: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'] },
  {
    id: 'people',
    label: 'People',
    paths: [
      circle(9, 8, 3),
      'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6',
      'M16 5.2a3 3 0 0 1 0 5.6',
    ],
  },
  {
    id: 'target',
    label: 'Target',
    paths: [circle(12, 12, 9), circle(12, 12, 5), circle(12, 12, 1)],
  },
  { id: 'clock', label: 'Clock', paths: [circle(12, 12, 9), 'M12 7v5l3 2'] },
]

export function findProjectIcon(
  id: string | undefined,
): ProjectIconDef | undefined {
  if (!id) return undefined
  return PROJECT_ICONS.find((icon) => icon.id === id)
}
