'use client';

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

const SITE_NAME = 'X7 Music Group';
const BASE_URL = 'https://x7musicgroup.com';
const DEFAULT_DESC =
  'X7 Music Group — Christian music label, consulting, publishing, and distribution services. Book a session with Steven Pantojas today.';

/**
 * Client-side document head manager — a drop-in replacement for the old
 * react-helmet <SEO /> so page components keep compiling unchanged.
 * (For richer SSR metadata, individual routes can also export Next `metadata`.)
 */
function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function SEO({ title, description, url, type = 'website' }: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const desc = description ?? DEFAULT_DESC;
    document.title = fullTitle;
    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    if (url) setMeta('meta[property="og:url"]', 'property', 'og:url', `${BASE_URL}${url}`);
  }, [title, description, url, type]);

  return null;
}
