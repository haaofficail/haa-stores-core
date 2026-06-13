import { PageTemplateSchema } from '../contracts/page'
import type { PageTemplate } from '../types/page'
import type { ValidationResult } from './validateTokens'

export function validatePageTemplate(input: unknown): ValidationResult<PageTemplate> {
  const result = PageTemplateSchema.safeParse(input)
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
