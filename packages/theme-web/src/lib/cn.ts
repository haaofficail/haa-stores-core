type ClassValue = string | number | boolean | null | undefined | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = []

  for (const input of inputs) {
    if (!input) continue

    if (Array.isArray(input)) {
      classes.push(cn(...input))
      continue
    }

    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input))
    }
  }

  return classes.join(' ')
}
