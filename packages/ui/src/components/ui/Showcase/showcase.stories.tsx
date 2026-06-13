import type { Meta } from '@storybook/react'
import { Badge, Button, Card, Container, Divider, EmptyState, Icon, NavigationBar, Progress, Select, Skeleton, Stack, Switch, TabBar, Text, TextArea } from '@/components/ui'

const meta: Meta = {
  title: 'Overview/All Components',
  parameters: { layout: 'fullscreen' },
}

export default meta

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'search', label: 'Search' },
  { id: 'profile', label: 'Profile' },
]

export const Showcase = () => (
  <Container>
    <Text variant="largeTitle">Component Showcase</Text>
    <Text variant="body" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-4)' }}>
      All HAA components in one view
    </Text>

    <Stack gap="var(--spacing-5)">
      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>Buttons</Text>
          <Stack direction="row" gap="var(--spacing-2)">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </Stack>
          <Stack direction="row" gap="var(--spacing-2)">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </Stack>
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>Badges</Text>
          <Stack direction="row" gap="var(--spacing-2)">
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="neutral">Neutral</Badge>
          </Stack>
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>Text</Text>
          <Text variant="largeTitle">Large Title</Text>
          <Text variant="title1">Title 1</Text>
          <Text variant="title2">Title 2</Text>
          <Text variant="body">Body text at 17pt — the quick brown fox jumps over the lazy dog.</Text>
          <Text variant="footnote">Footnote at 13pt</Text>
          <Text variant="caption1">Caption at 12pt</Text>
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>Form Controls</Text>
          <Input label="Email" placeholder="user@example.com" />
          <Select options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]} label="Choose" />
          <TextArea label="Bio" placeholder="Tell us about yourself..." />
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>Progress</Text>
          <Progress value={30} variant="primary" />
          <Progress value={65} variant="warning" />
          <Progress value={100} variant="success" />
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>EmptyState</Text>
          <EmptyState title="No items" description="Get started by adding your first item." action={<Button size="sm">Add Item</Button>} />
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>Switch</Text>
          <Stack direction="row" gap="var(--spacing-3)">
            <Switch />
            <Switch defaultChecked />
            <Switch disabled />
          </Stack>
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>Skeleton</Text>
          <Stack gap="var(--spacing-2)">
            <Skeleton width="60%" height={20} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="40%" height={16} />
          </Stack>
        </Stack>
      </Card>

      <Divider />

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>Cards</Text>
          <Card variant="elevated">Elevated card with shadow</Card>
          <Card variant="filled">Filled card</Card>
          <Card variant="outlined">Outlined card</Card>
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>NavigationBar</Text>
          <NavigationBar title="Home" leftAction={<Button variant="ghost" size="sm">Back</Button>} rightAction={<Button variant="ghost" size="sm">Edit</Button>} />
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{ fontWeight: 600 }}>TabBar</Text>
          <TabBar tabs={tabs} activeTab="home" onTabChange={() => {}} />
        </Stack>
      </Card>
    </Stack>
  </Container>
)
