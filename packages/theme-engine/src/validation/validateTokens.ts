import { ThemeTokensSchema } from '../contracts/tokens'
import type { ThemeTokens } from '../types/tokens'

export interface ValidationResult<T> {
  ok: boolean
  data?: T
  errors?: Array<{ path: string; message: string }>
}

export function validateTokens(input: unknown): ValidationResult<ThemeTokens> {
  const result = ThemeTokensSchema.safeParse(input)
  if (result.success) {
    return { ok: true, data: result.data }
  }
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  }
}
