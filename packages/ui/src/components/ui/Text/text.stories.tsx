import type { Meta, StoryObj } from '@storybook/react'
import { Text } from './index'

const meta: Meta<typeof Text> = {
  title: 'Components/Text',
  component: Text,
  argTypes: {
    variant: {
      control: 'select',
      options: ['largeTitle', 'title1', 'title2', 'title3', 'headline', 'body', 'callout', 'subhead', 'footnote', 'caption1', 'caption2'],
    },
    as: { control: 'select', options: ['h1', 'h2', 'h3', 'h4', 'p', 'span'] },
  },
}

export default meta
type Story = StoryObj<typeof Text>

export const LargeTitle: Story = { args: { variant: 'largeTitle', children: 'Large Title' } }
export const Title1: Story = { args: { variant: 'title1', children: 'Title 1' } }
export const Title2: Story = { args: { variant: 'title2', children: 'Title 2' } }
export const Body: Story = { args: { variant: 'body', children: 'The quick brown fox jumps over the lazy dog. Body text at 17pt.' } }
export const Callout: Story = { args: { variant: 'callout', children: 'Callout text at 16pt.' } }
export const Footnote: Story = { args: { variant: 'footnote', children: 'Footnote text at 13pt.' } }
export const Caption: Story = { args: { variant: 'caption1', children: 'Caption text at 12pt.' } }

export const AsH1: Story = { args: { as: 'h1', variant: 'largeTitle', children: 'Rendered as H1' } }
export const AsSpan: Story = { args: { as: 'span', variant: 'body', children: 'Rendered as <span>' } }
