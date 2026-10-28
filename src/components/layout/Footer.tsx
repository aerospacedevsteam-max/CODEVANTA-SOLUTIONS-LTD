import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { useSettings } from '@/context/SettingsContext';
import { NewsletterForm } from '@/components/forms/NewsletterForm';

const columns = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', to: '/products' },
      { label: 'Website templates', to: '/categories/website-templates' },
      { label: 'UI kits', to: '/categories/ui-kits' },
      { label: 'Business templates', to: '/categories/business-templates' },
      { label: 'Bundles', to: '/categories/bundles' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'FAQs', to: '/faqs' },
      { label: 'Support', to: '/support' },
      { label: 'Contact us', to: '/contact' },
      { label: 'About us', to: '/about' },
      { label: 'My downloads', to: '/account/downloads' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms & conditions', to: '/terms' },
      { label: 'Privacy policy', to: '/privacy' },
      { label: 'Refund & cancellation', to: '/refund-policy' },
      { label: 'Digital product licence', to: '/licence' },
      { label: 'Cookie policy', to: '/cookies' },
    ],
  },
];

export function Footer() {
  const { settings } = useSettings();
  const c = settings.company;
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-navy-950 text-navy-200">
      <div className="container-site grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm space-y-5">
          <Logo inverted />
          <p className="text-sm leading-6 text-navy-300">
            Original website templates, UI kits, developer resources and business templates — delivered digitally to your account.
          </p>
          {settings.homepage.show_newsletter && <NewsletterForm dark />}
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="text-sm font-semibold text-white">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="hover:text-white">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {settings.footer.links.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white">More</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {settings.footer.links.map((l) => (
                  <li key={l.href}><a href={l.href} className="hover:text-white">{l.label}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-3 py-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {c.legal_name ?? c.name}.
            {c.registration_number ? ` Registered in ${c.country ?? 'England and Wales'}, company no. ${c.registration_number}.` : ''}
            {c.registered_office ? ` Registered office: ${c.registered_office}.` : ''}
          </p>
          {settings.social.links.length > 0 && (
            <ul className="flex gap-4">
              {settings.social.links.map((s) => (
                <li key={s.href}>
                  <a href={s.href} rel="noopener noreferrer" target="_blank" className="hover:text-white">{s.label}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
