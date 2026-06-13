import type { Meta, StoryObj } from '@storybook/react'
import { Sheet } from './index'

const meta: Meta<typeof Sheet> = {
  title: 'Components/Sheet',
  component: Sheet,
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof Sheet>

export const Closed: Story = { args: { open: false, onClose: () => {}, children: null } }
export const Open: Story = { args: { open: true, onClose: () => {}, title: 'Sheet Title', children: 'Swipe up from bottom. This is a sheet component with a drag indicator.' } }
