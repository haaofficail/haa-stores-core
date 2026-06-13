import { ThemeExperienceContractSchema } from '../contracts/theme'
import type { ThemeExperienceContract } from '../types/theme'
import type { ValidationResult } from './validateTokens'

export function validateThemeContract(
  input: unknown
): ValidationResult<ThemeExperienceContract> {
  const result = ThemeExperienceContractSchema.safeParse(input)
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
