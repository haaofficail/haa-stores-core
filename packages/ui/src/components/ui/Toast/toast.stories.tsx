import type { Meta, StoryObj } from '@storybook/react'
import { Toast } from './index'

const meta: Meta<typeof Toast> = {
  title: 'Components/Toast',
  component: Toast,
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
    message: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Toast>

export const Info: Story = { args: { open: true, onClose: () => {}, message: 'This is an informational message.' } }
export const Success: Story = { args: { open: true, onClose: () => {}, message: 'Changes saved successfully.', variant: 'success' } }
export const Warning: Story = { args: { open: true, onClose: () => {}, message: 'Your session is about to expire.', variant: 'warning' } }
export const Danger: Story = { args: { open: true, onClose: () => {}, message: 'Connection lost.', variant: 'danger' } }
export const WithAction: Story = {
  args: { open: true, onClose: () => {}, message: 'Item deleted.', action: { label: 'Undo', onClick: () => {} } },
}
