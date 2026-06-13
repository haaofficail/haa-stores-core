/// <reference types="vite/client" />

declare module '@splidejs/react-splide' {
  import { ComponentType, RefAttributes, ReactNode } from 'react';
  import { Options } from '@splidejs/splide';

  interface SplideProps {
    options?: Options;
    extensions?: Record<string, unknown>;
    hasTrack?: boolean;
    tag?: string;
    children?: ReactNode;
    'aria-label'?: string;
    className?: string;
  }

  export const Splide: ComponentType<SplideProps & RefAttributes<any>>;
  export const SplideSlide: ComponentType<{ children?: ReactNode }>;
}

declare module '@splidejs/splide-extension-auto-scroll' {
  export const AutoScroll: Record<string, unknown>;
}
