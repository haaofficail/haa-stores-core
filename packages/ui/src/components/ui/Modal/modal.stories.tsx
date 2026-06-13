import type { Meta, StoryObj } from '@storybook/react'
import { Modal } from './index'
import { Button } from '@/components/ui/Button'

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

export const Closed: Story = {
  args: { open: false, onClose: () => {}, children: 'Content' },
}

export const Open: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Modal Title',
    children: 'This is the modal content. It can contain any React nodes.',
  },
}

export const WithActions: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Confirm',
    children: (
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end', marginTop: 'var(--spacing-4)' }}>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Confirm</Button>
      </div>
    ),
  },
}
