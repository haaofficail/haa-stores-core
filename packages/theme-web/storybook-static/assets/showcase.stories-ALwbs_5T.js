import{B as r}from"./index-CX1dy8eI.js";import{C as a}from"./index-BRybcErz.js";import{B as n}from"./index-DKffHckj.js";import{T as e}from"./index-B3tmIf5n.js";import{C as g,S as t,a as v,T as p,E,b as c,D as h,N as R,c as u}from"./index-yVJHiyJg.js";import{S as l}from"./index-Bj35BEhX.js";import"./index-NGyRR_en.js";import"./index-zmTGQa7e.js";import"./elevation-DLgQu6Og.js";import{P as o}from"./index-DlTMqp49.js";import"./index-DUipJMO7.js";import"./_commonjsHelpers-Cpj98o6Y.js";const N={title:"Overview/All Components",parameters:{layout:"fullscreen"}},f=[{id:"home",label:"Home"},{id:"search",label:"Search"},{id:"profile",label:"Profile"}],i=()=>React.createElement(g,null,React.createElement(e,{variant:"largeTitle"},"Component Showcase"),React.createElement(e,{variant:"body",style:{color:"var(--text-secondary)",marginBottom:"var(--spacing-4)"}},"All HAA components in one view"),React.createElement(t,{gap:"var(--spacing-5)"},React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"Buttons"),React.createElement(t,{direction:"row",gap:"var(--spacing-2)"},React.createElement(r,{variant:"primary"},"Primary"),React.createElement(r,{variant:"secondary"},"Secondary"),React.createElement(r,{variant:"ghost"},"Ghost"),React.createElement(r,{variant:"danger"},"Danger")),React.createElement(t,{direction:"row",gap:"var(--spacing-2)"},React.createElement(r,{size:"sm"},"Small"),React.createElement(r,{size:"md"},"Medium"),React.createElement(r,{size:"lg"},"Large"),React.createElement(r,{disabled:!0},"Disabled")))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"Badges"),React.createElement(t,{direction:"row",gap:"var(--spacing-2)"},React.createElement(n,{variant:"success"},"Success"),React.createElement(n,{variant:"warning"},"Warning"),React.createElement(n,{variant:"danger"},"Danger"),React.createElement(n,{variant:"info"},"Info"),React.createElement(n,{variant:"neutral"},"Neutral")))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"Text"),React.createElement(e,{variant:"largeTitle"},"Large Title"),React.createElement(e,{variant:"title1"},"Title 1"),React.createElement(e,{variant:"title2"},"Title 2"),React.createElement(e,{variant:"body"},"Body text at 17pt — the quick brown fox jumps over the lazy dog."),React.createElement(e,{variant:"footnote"},"Footnote at 13pt"),React.createElement(e,{variant:"caption1"},"Caption at 12pt"))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"Form Controls"),React.createElement(Input,{label:"Email",placeholder:"user@example.com"}),React.createElement(v,{options:[{value:"a",label:"Option A"},{value:"b",label:"Option B"}],label:"Choose"}),React.createElement(p,{label:"Bio",placeholder:"Tell us about yourself..."}))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"Progress"),React.createElement(o,{value:30,variant:"primary"}),React.createElement(o,{value:65,variant:"warning"}),React.createElement(o,{value:100,variant:"success"}))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"EmptyState"),React.createElement(E,{title:"No items",description:"Get started by adding your first item.",action:React.createElement(r,{size:"sm"},"Add Item")}))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"Switch"),React.createElement(t,{direction:"row",gap:"var(--spacing-3)"},React.createElement(l,null),React.createElement(l,{defaultChecked:!0}),React.createElement(l,{disabled:!0})))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"Skeleton"),React.createElement(t,{gap:"var(--spacing-2)"},React.createElement(c,{width:"60%",height:20}),React.createElement(c,{width:"90%",height:16}),React.createElement(c,{width:"40%",height:16})))),React.createElement(h,null),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"Cards"),React.createElement(a,{variant:"elevated"},"Elevated card with shadow"),React.createElement(a,{variant:"filled"},"Filled card"),React.createElement(a,{variant:"outlined"},"Outlined card"))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"NavigationBar"),React.createElement(R,{title:"Home",leftAction:React.createElement(r,{variant:"ghost",size:"sm"},"Back"),rightAction:React.createElement(r,{variant:"ghost",size:"sm"},"Edit")}))),React.createElement(a,{variant:"filled",padding:"md"},React.createElement(t,{gap:"var(--spacing-3)"},React.createElement(e,{variant:"title3",style:{fontWeight:600}},"TabBar"),React.createElement(u,{tabs:f,activeTab:"home",onTabChange:()=>{}})))));i.__docgenInfo={description:"",methods:[],displayName:"Showcase"};var d,s,m;i.parameters={...i.parameters,docs:{...(d=i.parameters)==null?void 0:d.docs,source:{originalSource:`() => <Container>
    <Text variant="largeTitle">Component Showcase</Text>
    <Text variant="body" style={{
    color: 'var(--text-secondary)',
    marginBottom: 'var(--spacing-4)'
  }}>
      All HAA components in one view
    </Text>

    <Stack gap="var(--spacing-5)">
      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{
          fontWeight: 600
        }}>Buttons</Text>
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
          <Text variant="title3" style={{
          fontWeight: 600
        }}>Badges</Text>
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
          <Text variant="title3" style={{
          fontWeight: 600
        }}>Text</Text>
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
          <Text variant="title3" style={{
          fontWeight: 600
        }}>Form Controls</Text>
          <Input label="Email" placeholder="user@example.com" />
          <Select options={[{
          value: 'a',
          label: 'Option A'
        }, {
          value: 'b',
          label: 'Option B'
        }]} label="Choose" />
          <TextArea label="Bio" placeholder="Tell us about yourself..." />
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{
          fontWeight: 600
        }}>Progress</Text>
          <Progress value={30} variant="primary" />
          <Progress value={65} variant="warning" />
          <Progress value={100} variant="success" />
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{
          fontWeight: 600
        }}>EmptyState</Text>
          <EmptyState title="No items" description="Get started by adding your first item." action={<Button size="sm">Add Item</Button>} />
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{
          fontWeight: 600
        }}>Switch</Text>
          <Stack direction="row" gap="var(--spacing-3)">
            <Switch />
            <Switch defaultChecked />
            <Switch disabled />
          </Stack>
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{
          fontWeight: 600
        }}>Skeleton</Text>
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
          <Text variant="title3" style={{
          fontWeight: 600
        }}>Cards</Text>
          <Card variant="elevated">Elevated card with shadow</Card>
          <Card variant="filled">Filled card</Card>
          <Card variant="outlined">Outlined card</Card>
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{
          fontWeight: 600
        }}>NavigationBar</Text>
          <NavigationBar title="Home" leftAction={<Button variant="ghost" size="sm">Back</Button>} rightAction={<Button variant="ghost" size="sm">Edit</Button>} />
        </Stack>
      </Card>

      <Card variant="filled" padding="md">
        <Stack gap="var(--spacing-3)">
          <Text variant="title3" style={{
          fontWeight: 600
        }}>TabBar</Text>
          <TabBar tabs={tabs} activeTab="home" onTabChange={() => {}} />
        </Stack>
      </Card>
    </Stack>
  </Container>`,...(m=(s=i.parameters)==null?void 0:s.docs)==null?void 0:m.source}}};const P=["Showcase"];export{i as Showcase,P as __namedExportsOrder,N as default};
