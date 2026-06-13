import"./index-CX1dy8eI.js";import"./index-BRybcErz.js";import"./index-DKffHckj.js";import"./index-B3tmIf5n.js";import{C as n,S as r,G as e}from"./index-yVJHiyJg.js";import"./index-Bj35BEhX.js";import"./index-NGyRR_en.js";import"./index-zmTGQa7e.js";import"./elevation-DLgQu6Og.js";import"./index-DlTMqp49.js";import"./index-DUipJMO7.js";import"./_commonjsHelpers-Cpj98o6Y.js";const f={title:"Layout/All Layouts",parameters:{layout:"fullscreen"}},a=()=>React.createElement(n,null,React.createElement("h1",{style:{fontSize:"var(--typography-title2-size)",fontWeight:600,marginBottom:"var(--spacing-4)"}},"Layout Components"),React.createElement("section",{style:{marginBottom:"var(--spacing-6)"}},React.createElement("h2",{style:{fontWeight:600,marginBottom:"var(--spacing-2)"}},"Stack (column = default)"),React.createElement(r,{gap:"var(--spacing-2)"},React.createElement("div",{style:{padding:"var(--spacing-2)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"Item 1"),React.createElement("div",{style:{padding:"var(--spacing-2)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"Item 2"),React.createElement("div",{style:{padding:"var(--spacing-2)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"Item 3"))),React.createElement("section",{style:{marginBottom:"var(--spacing-6)"}},React.createElement("h2",{style:{fontWeight:600,marginBottom:"var(--spacing-2)"}},"Stack (row)"),React.createElement(r,{direction:"row",gap:"var(--spacing-2)"},React.createElement("div",{style:{padding:"var(--spacing-2)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"A"),React.createElement("div",{style:{padding:"var(--spacing-2)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"B"),React.createElement("div",{style:{padding:"var(--spacing-2)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"C"))),React.createElement("section",{style:{marginBottom:"var(--spacing-6)"}},React.createElement("h2",{style:{fontWeight:600,marginBottom:"var(--spacing-2)"}},"Grid (2 columns)"),React.createElement(e,{columns:2,gap:"var(--spacing-2)"},React.createElement("div",{style:{padding:"var(--spacing-3)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"Column 1"),React.createElement("div",{style:{padding:"var(--spacing-3)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"Column 2"))),React.createElement("section",{style:{marginBottom:"var(--spacing-6)"}},React.createElement("h2",{style:{fontWeight:600,marginBottom:"var(--spacing-2)"}},"Grid (3 columns)"),React.createElement(e,{columns:3,gap:"var(--spacing-2)"},React.createElement("div",{style:{padding:"var(--spacing-3)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"Col 1"),React.createElement("div",{style:{padding:"var(--spacing-3)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"Col 2"),React.createElement("div",{style:{padding:"var(--spacing-3)",background:"var(--surface-2)",borderRadius:"var(--radius-sm)"}},"Col 3"))));a.__docgenInfo={description:"",methods:[],displayName:"Layouts"};var t,i,s;a.parameters={...a.parameters,docs:{...(t=a.parameters)==null?void 0:t.docs,source:{originalSource:`() => <Container>
    <h1 style={{
    fontSize: 'var(--typography-title2-size)',
    fontWeight: 600,
    marginBottom: 'var(--spacing-4)'
  }}>
      Layout Components
    </h1>

    <section style={{
    marginBottom: 'var(--spacing-6)'
  }}>
      <h2 style={{
      fontWeight: 600,
      marginBottom: 'var(--spacing-2)'
    }}>Stack (column = default)</h2>
      <Stack gap="var(--spacing-2)">
        <div style={{
        padding: 'var(--spacing-2)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>Item 1</div>
        <div style={{
        padding: 'var(--spacing-2)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>Item 2</div>
        <div style={{
        padding: 'var(--spacing-2)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>Item 3</div>
      </Stack>
    </section>

    <section style={{
    marginBottom: 'var(--spacing-6)'
  }}>
      <h2 style={{
      fontWeight: 600,
      marginBottom: 'var(--spacing-2)'
    }}>Stack (row)</h2>
      <Stack direction="row" gap="var(--spacing-2)">
        <div style={{
        padding: 'var(--spacing-2)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>A</div>
        <div style={{
        padding: 'var(--spacing-2)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>B</div>
        <div style={{
        padding: 'var(--spacing-2)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>C</div>
      </Stack>
    </section>

    <section style={{
    marginBottom: 'var(--spacing-6)'
  }}>
      <h2 style={{
      fontWeight: 600,
      marginBottom: 'var(--spacing-2)'
    }}>Grid (2 columns)</h2>
      <Grid columns={2} gap="var(--spacing-2)">
        <div style={{
        padding: 'var(--spacing-3)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>Column 1</div>
        <div style={{
        padding: 'var(--spacing-3)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>Column 2</div>
      </Grid>
    </section>

    <section style={{
    marginBottom: 'var(--spacing-6)'
  }}>
      <h2 style={{
      fontWeight: 600,
      marginBottom: 'var(--spacing-2)'
    }}>Grid (3 columns)</h2>
      <Grid columns={3} gap="var(--spacing-2)">
        <div style={{
        padding: 'var(--spacing-3)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>Col 1</div>
        <div style={{
        padding: 'var(--spacing-3)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>Col 2</div>
        <div style={{
        padding: 'var(--spacing-3)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)'
      }}>Col 3</div>
      </Grid>
    </section>
  </Container>`,...(s=(i=a.parameters)==null?void 0:i.docs)==null?void 0:s.source}}};const k=["Layouts"];export{a as Layouts,k as __namedExportsOrder,f as default};
