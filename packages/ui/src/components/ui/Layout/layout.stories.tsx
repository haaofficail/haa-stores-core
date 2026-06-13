import type { Meta, StoryObj } from '@storybook/react'
import { Stack, Grid, Container } from '@/components/ui'

const meta: Meta<typeof Stack> = {
  title: 'Layout/All Layouts',
  parameters: { layout: 'fullscreen' },
}

export default meta

export const Layouts = () => (
  <Container>
    <h1 style={{ fontSize: 'var(--typography-title2-size)', fontWeight: 600, marginBottom: 'var(--spacing-4)' }}>
      Layout Components
    </h1>

    <section style={{ marginBottom: 'var(--spacing-6)' }}>
      <h2 style={{ fontWeight: 600, marginBottom: 'var(--spacing-2)' }}>Stack (column = default)</h2>
      <Stack gap="var(--spacing-2)">
        <div style={{ padding: 'var(--spacing-2)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>Item 1</div>
        <div style={{ padding: 'var(--spacing-2)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>Item 2</div>
        <div style={{ padding: 'var(--spacing-2)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>Item 3</div>
      </Stack>
    </section>

    <section style={{ marginBottom: 'var(--spacing-6)' }}>
      <h2 style={{ fontWeight: 600, marginBottom: 'var(--spacing-2)' }}>Stack (row)</h2>
      <Stack direction="row" gap="var(--spacing-2)">
        <div style={{ padding: 'var(--spacing-2)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>A</div>
        <div style={{ padding: 'var(--spacing-2)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>B</div>
        <div style={{ padding: 'var(--spacing-2)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>C</div>
      </Stack>
    </section>

    <section style={{ marginBottom: 'var(--spacing-6)' }}>
      <h2 style={{ fontWeight: 600, marginBottom: 'var(--spacing-2)' }}>Grid (2 columns)</h2>
      <Grid columns={2} gap="var(--spacing-2)">
        <div style={{ padding: 'var(--spacing-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>Column 1</div>
        <div style={{ padding: 'var(--spacing-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>Column 2</div>
      </Grid>
    </section>

    <section style={{ marginBottom: 'var(--spacing-6)' }}>
      <h2 style={{ fontWeight: 600, marginBottom: 'var(--spacing-2)' }}>Grid (3 columns)</h2>
      <Grid columns={3} gap="var(--spacing-2)">
        <div style={{ padding: 'var(--spacing-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>Col 1</div>
        <div style={{ padding: 'var(--spacing-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>Col 2</div>
        <div style={{ padding: 'var(--spacing-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>Col 3</div>
      </Grid>
    </section>
  </Container>
)
