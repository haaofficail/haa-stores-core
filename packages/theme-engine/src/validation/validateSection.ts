import { SectionInstanceSchema } from '../contracts/section'
import type { SectionInstance } from '../types/section'
import type { ValidationResult } from './validateTokens'

export function validateSection(input: unknown): ValidationResult<SectionInstance> {
  const result = SectionInstanceSchema.safeParse(input)
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
