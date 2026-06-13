import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

export function useSEO({ title = '', description, ogImage, ogType = 'website', noIndex }: SEOProps) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (!description) return;
    let el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!el) {
      el = document.createElement('meta');
      el.name = 'description';
      document.head.appendChild(el);
    }
    el.content = description;
  }, [description]);

  useEffect(() => {
    if (!ogImage) return;
    let el = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', 'og:image');
      document.head.appendChild(el);
    }
    el.content = ogImage;
  }, [ogImage]);

  useEffect(() => {
    let el = document.querySelector<HTMLMetaElement>('meta[property="og:type"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', 'og:type');
      document.head.appendChild(el);
    }
    el.content = ogType;
  }, [ogType]);

  useEffect(() => {
    if (!title) return;
    let el = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', 'og:title');
      document.head.appendChild(el);
    }
    el.content = title;
  }, [title]);

  useEffect(() => {
    if (!description) return;
    let el = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', 'og:description');
      document.head.appendChild(el);
    }
    el.content = description;
  }, [description]);

  useEffect(() => {
    let el = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noIndex) {
      if (!el) {
        el = document.createElement('meta');
        el.name = 'robots';
        document.head.appendChild(el);
      }
      el.content = 'noindex, nofollow';
    } else if (el) {
      el.remove();
    }
  }, [noIndex]);
}
