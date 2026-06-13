import{r as a}from"./index-NGyRR_en.js";import{r as v}from"./index-zmTGQa7e.js";import{g as y}from"./elevation-DLgQu6Og.js";import"./_commonjsHelpers-Cpj98o6Y.js";function x({open:r,onClose:o,title:n,children:u}){const[h,g]=a.useState(!1);return a.useEffect(()=>{g(!0)},[]),a.useEffect(()=>{if(!r)return;const s=f=>{f.key==="Escape"&&o()};return document.addEventListener("keydown",s),document.body.style.overflow="hidden",()=>{document.removeEventListener("keydown",s),document.body.style.overflow=""}},[r,o]),!h||!r?null:v.createPortal(React.createElement("div",{style:{position:"fixed",inset:0,zIndex:"var(--z-overlay)",display:"flex",alignItems:"flex-end",justifyContent:"center"}},React.createElement("div",{onClick:o,style:{position:"absolute",inset:0,background:"var(--backdrop-color)",opacity:.4,animation:"haaFadeIn 150ms ease-out"}}),React.createElement("div",{style:{position:"relative",width:"100%",maxWidth:"640px",maxHeight:"85vh",background:"var(--material-regular-lightBackground, var(--surface-1))",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:"var(--radius-xl) var(--radius-xl) 0 0",padding:"var(--spacing-5)",overflow:"auto",animation:"haaSlideUp 300ms var(--ease-spring-smooth)",...y(3)}},React.createElement("div",{style:{width:36,height:5,borderRadius:3,background:"var(--color-neutral-300)",margin:"-8px auto var(--spacing-3)"}}),n&&React.createElement("h2",{style:{fontSize:"var(--typography-title2-size)",fontWeight:600,marginBottom:"var(--spacing-3)",color:"var(--text-primary)"}},n),u)),document.body)}const w={title:"Components/Sheet",component:x,argTypes:{open:{control:"boolean"},title:{control:"text"}}},e={args:{open:!1,onClose:()=>{},children:null}},t={args:{open:!0,onClose:()=>{},title:"Sheet Title",children:"Swipe up from bottom. This is a sheet component with a drag indicator."}};var i,l,c;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    open: false,
    onClose: () => {},
    children: null
  }
}`,...(c=(l=e.parameters)==null?void 0:l.docs)==null?void 0:c.source}}};var d,p,m;t.parameters={...t.parameters,docs:{...(d=t.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    open: true,
    onClose: () => {},
    title: 'Sheet Title',
    children: 'Swipe up from bottom. This is a sheet component with a drag indicator.'
  }
}`,...(m=(p=t.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};const C=["Closed","Open"];export{e as Closed,t as Open,C as __namedExportsOrder,w as default};
