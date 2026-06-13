import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './index'

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = { args: { placeholder: 'Enter text...' } }
export const WithLabel: Story = { args: { label: 'Email', placeholder: 'user@example.com' } }
export const WithError: Story = { args: { label: 'Password', error: 'Required', type: 'password' } }
export const Disabled: Story = { args: { disabled: true, value: 'Disabled input' } }
