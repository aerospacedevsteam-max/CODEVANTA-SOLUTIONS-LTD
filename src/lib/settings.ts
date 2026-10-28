// Shape of the public site_settings rows, with safe defaults used until the
// database responds. Company facts are deliberately null until supplied.

export interface SiteSettings {
  announcement: { enabled: boolean; text: string; link_label?: string | null; link_href?: string | null };
  company: {
    name: string;
    legal_name: string | null;
    registration_number: string | null;
    registered_office: string | null;
    country: string | null;
    support_email: string | null;
    phone: string | null;
    logo_path: string | null;
    incorporated_on?: string | null;
  };
  social: { links: { label: string; href: string }[] };
  homepage: {
    show_new_arrivals: boolean;
    show_bestsellers: boolean;
    show_featured_bundle: boolean;
    show_newsletter: boolean;
    featured_bundle_slug: string | null;
  };
  footer: { links: { label: string; href: string }[] };
  seo: { default_title: string; default_description: string };
  commerce: {
    currencies: string[];
    default_currency: string;
    payments_enabled: boolean;
    /** Server-enforced: 'no_charge' completes orders without payment until a gateway is connected. */
    checkout_mode: 'no_charge' | 'payments' | 'disabled';
    payment_provider_label: string | null;
    payment_methods_note: string | null;
    download_limit: number;
  };
}

export const defaultSettings: SiteSettings = {
  announcement: { enabled: true, text: 'Discover digital resources for your next project.', link_label: null, link_href: null },
  company: {
    name: 'CODEVANTASOLUTIONSLTD',
    legal_name: null,
    registration_number: null,
    registered_office: null,
    country: null,
    support_email: null,
    phone: null,
    logo_path: null,
  },
  social: { links: [] },
  homepage: {
    show_new_arrivals: true,
    show_bestsellers: true,
    show_featured_bundle: true,
    show_newsletter: true,
    featured_bundle_slug: 'website-starter-collection',
  },
  footer: { links: [] },
  seo: {
    default_title: 'CODEVANTASOLUTIONSLTD — Digital resources to build better, faster',
    default_description:
      'Original website templates, UI kits, developer resources and business templates, delivered digitally.',
  },
  commerce: {
    currencies: ['USD'],
    default_currency: 'USD',
    payments_enabled: false,
    checkout_mode: 'disabled',
    payment_provider_label: null,
    payment_methods_note: null,
    download_limit: 15,
  },
};

export function mergeSettings(partial: Partial<SiteSettings>): SiteSettings {
  const out = { ...defaultSettings } as SiteSettings;
  for (const key of Object.keys(defaultSettings) as (keyof SiteSettings)[]) {
    const value = partial[key];
    if (value && typeof value === 'object') {
      (out as unknown as Record<string, unknown>)[key] = { ...defaultSettings[key], ...value };
    }
  }
  return out;
}
