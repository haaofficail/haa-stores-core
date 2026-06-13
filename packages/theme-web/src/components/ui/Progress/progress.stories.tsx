import type { Meta, StoryObj } from '@storybook/react'
import { Progress } from './index'

const meta: Meta<typeof Progress> = {
  title: 'Components/Progress',
  component: Progress,
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    variant: { control: 'select', options: ['primary', 'success', 'warning', 'danger'] },
    size: { control: 'select', options: ['sm', 'md'] },
  },
}

export default meta
type Story = StoryObj<typeof Progress>

export const Halfway: Story = { args: { value: 50 } }
export const AlmostDone: Story = { args: { value: 85, variant: 'success' } }
export const Warning: Story = { args: { value: 65, variant: 'warning' } }
export const Small: Story = { args: { value: 30, size: 'sm' } }
