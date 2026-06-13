import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './index'

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  argTypes: {
    variant: { control: 'select', options: ['elevated', 'filled', 'outlined'] },
    padding: { control: 'select', options: ['sm', 'md', 'lg', 'none'] },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Elevated: Story = {
  args: { variant: 'elevated', children: 'This is an elevated card with a subtle shadow.' },
}

export const Filled: Story = {
  args: { variant: 'filled', children: 'Filled card with surface-2 background.' },
}

export const Outlined: Story = {
  args: { variant: 'outlined', children: 'Outlined card with a border.' },
}

export const SmallPadding: Story = {
  args: { padding: 'sm', children: 'Tight padding.' },
}

export const LargePadding: Story = {
  args: { padding: 'lg', children: 'Spacious padding.' },
}
