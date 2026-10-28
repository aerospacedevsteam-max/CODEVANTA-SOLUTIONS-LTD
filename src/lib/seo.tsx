import { useLocation } from 'react-router-dom';
import { siteUrl } from './supabase';

interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'product' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BRAND = 'CODEVANTASOLUTIONSLTD';
const DEFAULT_DESCRIPTION =
  'Original website templates, UI kits, developer resources and business templates, delivered digitally by CODEVANTASOLUTIONSLTD.';

/** React 19 hoists <title>, <meta> and <link> rendered anywhere into <head>. */
export function Seo({ title, description = DEFAULT_DESCRIPTION, image, noindex, type = 'website', jsonLd }: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = title.includes(BRAND) ? title : `${title} | ${BRAND}`;
  const canonical = `${siteUrl}${pathname === '/' ? '' : pathname}`;
  const img = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : `${siteUrl}/previews/og-default.jpg`;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:site_name" content={BRAND} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={img} />
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </>
  );
}
