import { Link } from 'react-router-dom';
import { Compass, FileQuestion, LifeBuoy, Mail, PackageCheck, ScrollText } from 'lucide-react';
import { Seo } from '@/lib/seo';
import { faqs } from '@/lib/faq';
import { useSettings } from '@/context/SettingsContext';
import { Accordion } from '@/components/ui/Accordion';
import { EmptyState, PageHeader } from '@/components/ui';
import { EnquiryForm } from '@/components/forms/EnquiryForm';

export function About() {
  const { settings } = useSettings();
  const c = settings.company;
  return (
    <>
      <Seo title="About us" description="CODEVANTASOLUTIONSLTD creates original digital resources: website templates, UI kits, developer resources and business templates." />
      <PageHeader title="About CODEVANTASOLUTIONSLTD" description="We create practical digital resources that help creators and businesses get their next project started." />
      <div className="container-site grid gap-12 py-12 lg:grid-cols-[1fr_20rem]">
        <div className="prose-site">
          <h2>What we make</h2>
          <p>
            CODEVANTASOLUTIONSLTD designs and builds original digital products: responsive website templates, UI starter kits, developer
            components and business spreadsheets. Every product is created in-house and is sold with a clear licence that explains exactly how
            it may be used.
          </p>
          <h2>How we work</h2>
          <ul>
            <li><strong>Original work only.</strong> We do not resell third-party templates or files we do not have the rights to.</li>
            <li><strong>Checked before sale.</strong> A product goes on sale only after its files exist and have been checked. Until then it is labelled “In development”.</li>
            <li><strong>Honest listings.</strong> We do not show invented reviews, fake discounts or made-up sales numbers. Ratings come only from verified buyers.</li>
            <li><strong>Secure delivery.</strong> Files are stored privately and released only to the account that bought them.</li>
          </ul>
          <h2>Company information</h2>
          <dl className="not-prose grid gap-x-6 gap-y-2 rounded-xl border border-slate-200 p-5 text-sm sm:grid-cols-[12rem_1fr]">
            {[
              ['Registered name', c.legal_name],
              ['Company number', c.registration_number],
              ['Registered in', c.country],
              ['Registered office', c.registered_office],
              ['Email', c.support_email],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-medium text-navy-900">{k}</dt>
                  <dd className="text-ink-muted">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
        <aside className="space-y-4">
          <div className="card p-6">
            <Compass className="h-6 w-6 text-brand-600" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold">Explore the catalogue</h2>
            <p className="mt-1 text-sm text-ink-muted">See every published product and what’s included.</p>
            <Link to="/products" className="btn-primary mt-4">Browse products</Link>
          </div>
          <div className="card p-6">
            <Mail className="h-6 w-6 text-brand-600" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold">Talk to us</h2>
            <p className="mt-1 text-sm text-ink-muted">Questions about a product or licence?</p>
            <Link to="/contact" className="btn-secondary mt-4">Contact us</Link>
          </div>
        </aside>
      </div>
    </>
  );
}

export function Contact() {
  const { settings } = useSettings();
  const c = settings.company;
  return (
    <>
      <Seo title="Contact us" description="Send CODEVANTASOLUTIONSLTD a question about products, licensing or purchases." />
      <PageHeader title="Contact us" description="Questions about a product, licensing or a purchase? Send us a message and we will reply by email." />
      <div className="container-site grid gap-12 py-12 lg:grid-cols-[1fr_20rem]">
        <div className="card p-6 sm:p-8"><EnquiryForm /></div>
        <aside className="space-y-4 text-sm">
          <div className="card p-6">
            <h2 className="text-base font-semibold">Other ways to reach us</h2>
            <dl className="mt-3 space-y-3 text-ink-muted">
              {c.support_email && <div><dt className="font-medium text-navy-900">Email</dt><dd><a className="underline" href={`mailto:${c.support_email}`}>{c.support_email}</a></dd></div>}
              {c.phone && <div><dt className="font-medium text-navy-900">Phone</dt><dd>{c.phone}</dd></div>}
              {c.registered_office && <div><dt className="font-medium text-navy-900">Registered office</dt><dd>{c.registered_office}</dd></div>}
              {c.legal_name && <div><dt className="font-medium text-navy-900">Company</dt><dd>{c.legal_name}{c.registration_number ? ` · No. ${c.registration_number}` : ''}</dd></div>}
            </dl>
          </div>
          <div className="card p-6">
            <h2 className="text-base font-semibold">Already a customer?</h2>
            <p className="mt-1 text-ink-muted">Raise a support request from your account so we can see your order.</p>
            <Link to="/account/support" className="btn-secondary mt-4">Open a support request</Link>
          </div>
        </aside>
      </div>
    </>
  );
}

export function Faqs() {
  const groups = [...new Set(faqs.map((f) => f.group))];
  return (
    <>
      <Seo
        title="Frequently asked questions"
        description="Answers about buying, downloading and licensing CODEVANTASOLUTIONSLTD digital products."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }}
      />
      <PageHeader title="Frequently asked questions" description="Buying, downloads, licensing and support." />
      <div className="container-site max-w-3xl space-y-10 py-12">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`faq-${g}`}>
            <h2 id={`faq-${g}`} className="mb-4 text-lg font-semibold">{g}</h2>
            <Accordion items={faqs.filter((f) => f.group === g)} />
          </section>
        ))}
        <section aria-labelledby="faq-reviews">
          <h2 id="faq-reviews" className="mb-4 text-lg font-semibold">Review policy</h2>
          <div className="prose-site rounded-xl border border-slate-200 p-5">
            <p>Only customers with a confirmed purchase of a product can review it, once per product. Every review is checked before publication.</p>
            <p>We publish positive and negative reviews alike. We reject or remove reviews that contain personal data, offensive or unlawful content, spam or advertising, or content unrelated to the product. Only the reviewer’s first name is displayed. Reviews are never written, edited or paid for by us.</p>
          </div>
        </section>
      </div>
    </>
  );
}

export function SupportPage() {
  const cards = [
    { icon: PackageCheck, title: 'Downloads', text: 'Find and re-download your purchases.', to: '/account/downloads', cta: 'My downloads' },
    { icon: LifeBuoy, title: 'Support requests', text: 'Ask about an order or a problem with your files.', to: '/account/support', cta: 'Open a request' },
    { icon: FileQuestion, title: 'FAQs', text: 'Answers to common questions.', to: '/faqs', cta: 'Read FAQs' },
    { icon: ScrollText, title: 'Licence & refunds', text: 'How you can use the files and when refunds apply.', to: '/licence', cta: 'Read licence' },
  ];
  return (
    <>
      <Seo title="Support" description="Get help with downloads, orders and licensing." />
      <PageHeader title="Support centre" description="We are here to help with downloads, orders and using your files." />
      <div className="container-site py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.title} className="card flex flex-col p-6">
              <c.icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
              <h2 className="mt-3 text-base font-semibold">{c.title}</h2>
              <p className="mt-1 flex-1 text-sm text-ink-muted">{c.text}</p>
              <Link to={c.to} className="btn-secondary mt-4">{c.cta}</Link>
            </div>
          ))}
        </div>
        <div className="prose-site mt-12 max-w-3xl">
          <h2>What support covers</h2>
          <ul>
            <li>Problems downloading or opening your files.</li>
            <li>Questions about what is included and how to set it up, as described in the product documentation.</li>
            <li>Reports of defects in the files as supplied.</li>
          </ul>
          <p>Custom development and changes to your own project are not covered, but you can ask about them through the <Link to="/contact">contact form</Link>.</p>
        </div>
      </div>
    </>
  );
}

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" noindex />
      <div className="container-site py-20">
        <EmptyState
          level={1}
          icon={FileQuestion}
          title="We couldn’t find that page"
          action={<div className="flex flex-wrap justify-center gap-3"><Link to="/" className="btn-primary">Go home</Link><Link to="/products" className="btn-secondary">Browse products</Link></div>}
        >
          The link may be broken, or the product may no longer be available.
        </EmptyState>
      </div>
    </>
  );
}
