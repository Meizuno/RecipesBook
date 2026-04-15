const COLORS = [
  'cyan', 'violet', 'amber', 'emerald', 'rose', 'sky',
  'indigo', 'pink', 'orange', 'teal', 'lime', 'red',
  'green', 'blue', 'purple', 'yellow'
]

export function nextColor(index: number): string {
  return COLORS[index % COLORS.length]
}
