import{r as e}from"./index-NGyRR_en.js";import{r as F}from"./index-zmTGQa7e.js";import{g as U}from"./elevation-DLgQu6Og.js";import"./_commonjsHelpers-Cpj98o6Y.js";const A={success:"var(--color-success)",warning:"var(--color-warning)",danger:"var(--color-danger)",info:"var(--color-info)"},O={success:"var(--color-success-text)",warning:"var(--color-warning-text)",danger:"var(--color-danger-text)",info:"var(--color-info-text)"};function Y({open:t,onClose:g,variant:u="info",message:k,duration:c=3e3,action:i}){const[I,z]=e.useState(!1),[R,l]=e.useState(!1);return e.useEffect(()=>{z(!0)},[]),e.useEffect(()=>{if(t){if(l(!0),c>0){const D=setTimeout(()=>{l(!1),setTimeout(g,200)},c);return()=>clearTimeout(D)}}else l(!1)},[t,c,g]),!I||!t?null:F.createPortal(React.createElement("div",{role:"alert",style:{position:"fixed",bottom:"var(--safe-bottom, 24px)",left:"50%",transform:"translateX(-50%)",zIndex:"var(--z-toast)",display:"flex",alignItems:"center",gap:"var(--spacing-2)",padding:"var(--spacing-3) var(--spacing-4)",borderRadius:"var(--radius-lg)",background:A[u],color:O[u],fontSize:"var(--typography-callout-size)",fontWeight:500,fontFamily:"var(--font-sans)",maxWidth:"90vw",...U(5),animation:R?"haaSlideUpFade 200ms var(--ease-spring-snappy)":"haaFadeOut 200ms ease-in",pointerEvents:"auto"}},React.createElement("span",{style:{flex:1}},k),i&&React.createElement("button",{onClick:i.onClick,style:{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"var(--radius-sm)",padding:"var(--spacing-1) var(--spacing-2)",color:"inherit",fontWeight:600,cursor:"pointer",fontSize:"inherit"}},i.label)),document.body)}const V={title:"Components/Toast",component:Y,argTypes:{variant:{control:"select",options:["info","success","warning","danger"]},message:{control:"text"}}},s={args:{open:!0,onClose:()=>{},message:"This is an informational message."}},a={args:{open:!0,onClose:()=>{},message:"Changes saved successfully.",variant:"success"}},r={args:{open:!0,onClose:()=>{},message:"Your session is about to expire.",variant:"warning"}},n={args:{open:!0,onClose:()=>{},message:"Connection lost.",variant:"danger"}},o={args:{open:!0,onClose:()=>{},message:"Item deleted.",action:{label:"Undo",onClick:()=>{}}}};var m,p,d;s.parameters={...s.parameters,docs:{...(m=s.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    open: true,
    onClose: () => {},
    message: 'This is an informational message.'
  }
}`,...(d=(p=s.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};var f,v,x;a.parameters={...a.parameters,docs:{...(f=a.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    open: true,
    onClose: () => {},
    message: 'Changes saved successfully.',
    variant: 'success'
  }
}`,...(x=(v=a.parameters)==null?void 0:v.docs)==null?void 0:x.source}}};var C,b,h;r.parameters={...r.parameters,docs:{...(C=r.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    open: true,
    onClose: () => {},
    message: 'Your session is about to expire.',
    variant: 'warning'
  }
}`,...(h=(b=r.parameters)==null?void 0:b.docs)==null?void 0:h.source}}};var y,S,E;n.parameters={...n.parameters,docs:{...(y=n.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    open: true,
    onClose: () => {},
    message: 'Connection lost.',
    variant: 'danger'
  }
}`,...(E=(S=n.parameters)==null?void 0:S.docs)==null?void 0:E.source}}};var T,w,W;o.parameters={...o.parameters,docs:{...(T=o.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    open: true,
    onClose: () => {},
    message: 'Item deleted.',
    action: {
      label: 'Undo',
      onClick: () => {}
    }
  }
}`,...(W=(w=o.parameters)==null?void 0:w.docs)==null?void 0:W.source}}};const X=["Info","Success","Warning","Danger","WithAction"];export{n as Danger,s as Info,a as Success,r as Warning,o as WithAction,X as __namedExportsOrder,V as default};
