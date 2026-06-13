import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './index'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: 'Primary Action' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary Action' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost Action' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete' },
}

export const Small: Story = {
  args: { size: 'sm', children: 'Small' },
}

export const Large: Story = {
  args: { size: 'lg', children: 'Large Button' },
}

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
}
