import{r as t}from"./index-NGyRR_en.js";import{r as k}from"./index-zmTGQa7e.js";import{g as R}from"./elevation-DLgQu6Og.js";import{B as l}from"./index-CX1dy8eI.js";import"./_commonjsHelpers-Cpj98o6Y.js";function B({open:n,onClose:s,title:i,children:C}){const[x,b]=t.useState(!1),c=t.useRef(null);return t.useEffect(()=>{b(!0)},[]),t.useEffect(()=>{if(!n)return;const e=E=>{E.key==="Escape"&&s()};return document.addEventListener("keydown",e),document.body.style.overflow="hidden",()=>{document.removeEventListener("keydown",e),document.body.style.overflow=""}},[n,s]),!x||!n?null:k.createPortal(React.createElement("div",{ref:c,role:"dialog","aria-modal":"true","aria-label":i,onClick:e=>{e.target===c.current&&s()},style:{position:"fixed",inset:0,zIndex:"var(--z-modal)",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--backdrop-color)",opacity:"var(--backdrop-opacity, 0.5)",backdropFilter:"blur(var(--backdrop-blur, 8px))",WebkitBackdropFilter:"blur(var(--backdrop-blur, 8px))",animation:"haaFadeIn 150ms ease-out"}},React.createElement("div",{onClick:e=>e.stopPropagation(),style:{background:"var(--surface-1)",borderRadius:"var(--radius-xl)",padding:"var(--spacing-5)",maxWidth:"540px",width:"90vw",maxHeight:"80vh",overflow:"auto",animation:"haaScaleIn 200ms var(--ease-spring-smooth)",...R(4)}},i&&React.createElement("h2",{style:{fontSize:"var(--typography-title2-size)",fontWeight:600,marginBottom:"var(--spacing-3)",color:"var(--text-primary)"}},i),C)),document.body)}const W={title:"Components/Modal",component:B,argTypes:{open:{control:"boolean"},title:{control:"text"}}},a={args:{open:!1,onClose:()=>{},children:"Content"}},r={args:{open:!0,onClose:()=>{},title:"Modal Title",children:"This is the modal content. It can contain any React nodes."}},o={args:{open:!0,onClose:()=>{},title:"Confirm",children:React.createElement("div",{style:{display:"flex",gap:"var(--spacing-2)",justifyContent:"flex-end",marginTop:"var(--spacing-4)"}},React.createElement(l,{variant:"secondary"},"Cancel"),React.createElement(l,{variant:"primary"},"Confirm"))}};var d,p,m;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    open: false,
    onClose: () => {},
    children: 'Content'
  }
}`,...(m=(p=a.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};var u,f,v;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    open: true,
    onClose: () => {},
    title: 'Modal Title',
    children: 'This is the modal content. It can contain any React nodes.'
  }
}`,...(v=(f=r.parameters)==null?void 0:f.docs)==null?void 0:v.source}}};var g,y,h;o.parameters={...o.parameters,docs:{...(g=o.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    open: true,
    onClose: () => {},
    title: 'Confirm',
    children: <div style={{
      display: 'flex',
      gap: 'var(--spacing-2)',
      justifyContent: 'flex-end',
      marginTop: 'var(--spacing-4)'
    }}>
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Confirm</Button>
      </div>
  }
}`,...(h=(y=o.parameters)==null?void 0:y.docs)==null?void 0:h.source}}};const z=["Closed","Open","WithActions"];export{a as Closed,r as Open,o as WithActions,z as __namedExportsOrder,W as default};
