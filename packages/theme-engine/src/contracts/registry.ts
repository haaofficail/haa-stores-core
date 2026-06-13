import { z } from 'zod'
import { ThemeExperienceContractSchema } from './theme'
import { ThemeTokensSchema } from './tokens'
import { PageTemplateSchema, SupportedPageSchema } from './page'

export const ThemeDefinitionSchema = z.object({
  contract: ThemeExperienceContractSchema,
  tokens: ThemeTokensSchema,
  pages: z
    .record(z.string(), PageTemplateSchema)
    .refine(
      (pages) => {
        // All page keys must be valid SupportedPage values
        return Object.keys(pages).every((k) =>
          SupportedPageSchema.safeParse(k).success
        )
      },
      { message: 'All page keys must be valid SupportedPage values' }
    )
    .refine(
      (pages) => {
        // Every supported page must have a template
        for (const key of Object.keys(pages)) {
          if (!PageTemplateSchema.safeParse(pages[key]).success) return false
        }
        return true
      },
      { message: 'Every page must have a valid PageTemplate' }
    ),
})
