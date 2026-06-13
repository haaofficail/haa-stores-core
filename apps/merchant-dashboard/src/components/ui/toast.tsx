import { Toaster as SonnerToaster } from 'sonner';

function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      dir="rtl"
      toastOptions={{
        style: { fontFamily: 'inherit' },
      }}
    />
  );
}

export { Toaster };
