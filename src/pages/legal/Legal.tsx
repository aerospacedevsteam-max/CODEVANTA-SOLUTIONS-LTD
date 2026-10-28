import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/lib/seo';
import { useSettings } from '@/context/SettingsContext';
import { PageHeader } from '@/components/ui';

const LAST_UPDATED = '29 October 2026';

function LegalPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <>
      <Seo title={title} description={description} />
      <PageHeader title={title} description={`Last updated: ${LAST_UPDATED}`} />
      <div className="container-site max-w-3xl py-12">
        <div className="prose-site">{children}</div>
      </div>
    </>
  );
}

function useCompany() {
  const c = useSettings().settings.company;
  return {
    name: c.legal_name ?? 'CODEVANTA SOLUTIONS LTD',
    email: c.support_email,
    office: c.registered_office ?? 'Office 22003, 182-184 High Street North, East Ham, E6 2JA, United Kingdom',
    country: c.country ?? 'England and Wales',
    reg: c.registration_number ?? '17535159',
  };
}

/** Support email when configured, otherwise the contact form. */
function ContactLink({ email }: { email: string | null }) {
  return email ? <a href={`mailto:${email}`}>{email}</a> : <Link to="/contact">our contact form</Link>;
}

function CompanyLine() {
  const c = useCompany();
  return (
    <p>
      {c.name} is a private limited company registered in {c.country} under company number {c.reg}. Registered office: {c.office}.
      Contact: <ContactLink email={c.email} />.
    </p>
  );
}

export function Terms() {
  const c = useCompany();
  return (
    <LegalPage title="Terms and Conditions" description={`The terms that apply when you use this website and order digital products from ${c.name}.`}>
      <h2>1. About us</h2>
      <CompanyLine />
      <p>In these terms “we”, “us” and “our” mean {c.name}, and “you” means the person using the website or placing an order.</p>

      <h2>2. What we sell</h2>
      <p>
        We sell digital products — website templates, UI kits, developer resources and spreadsheets — supplied as downloadable files. Each product
        page describes what is included, the technical requirements and the version supplied. No physical goods are shipped.
      </p>

      <h2>3. Your account</h2>
      <p>
        You need an account to order and download products. Keep your login details secure; you are responsible for activity under your account.
        We may suspend accounts used for fraud, abuse or in breach of the licence.
      </p>

      <h2>4. Prices and payment</h2>
      <ul>
        <li>Prices are shown in US dollars (USD). The amount for your order is calculated by our server and shown before you complete it.</li>
        <li>Where we take payment, it is processed by a payment provider on its own secure pages. We never receive or store your full card details.</li>
        <li>While online payment is not available, orders are completed without charge, and this is stated at checkout.</li>
        <li>If a price is shown incorrectly because of an obvious error, we may cancel the order and refund any amount paid.</li>
        <li>Where VAT or another sales tax applies to your order, it will be shown before you complete the order.</li>
      </ul>

      <h2>5. How the contract is formed</h2>
      <p>A contract is formed when your order is completed and confirmed on screen. The products then become available in your account.</p>

      <h2>6. Delivery</h2>
      <p>
        Products are available under Account → Downloads as soon as your order is complete. Download links are created when you request them and
        expire after a short time. Each purchase includes the download allowance shown in your account.
      </p>

      <h2>7. Licence</h2>
      <p>
        Your use of the files is governed by the <Link to="/licence">Digital Product Licence</Link>. An order gives you a licence to use the files; it
        does not transfer copyright.
      </p>

      <h2>8. Your rights and cancellations</h2>
      <p>
        If you are a consumer, you have rights under the Consumer Rights Act 2015: digital content must be of satisfactory quality, fit for purpose
        and as described. Cancellation and refunds are explained in our <Link to="/refund-policy">Refund and Cancellation Policy</Link>.
      </p>

      <h2>9. Reviews and content you submit</h2>
      <p>
        Reviews may be submitted only by customers who have ordered the product and are moderated as described in our{' '}
        <Link to="/faqs">review policy</Link>. Do not submit unlawful, offensive or personal content.
      </p>

      <h2>10. Our liability</h2>
      <p>
        We are responsible for foreseeable loss caused by our breach of these terms or our negligence. We do not exclude liability where it would be
        unlawful to do so, including for death or personal injury caused by negligence or for fraud. If digital content we supply damages a device
        or other digital content belonging to you because we did not use reasonable care and skill, we will repair the damage or compensate you.
        We are not liable for business losses, or for loss caused by changes you make to the files or by third-party software you use with them.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>We may update these terms. The version in force when you place an order applies to that order.</p>

      <h2>12. Law and disputes</h2>
      <p>
        These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you live in Scotland or
        Northern Ireland you may also bring proceedings there, and if you live elsewhere you keep any mandatory protections of the law where you live.
      </p>
    </LegalPage>
  );
}

export function Privacy() {
  const c = useCompany();
  return (
    <LegalPage title="Privacy Policy" description={`How ${c.name} collects, uses and protects personal data.`}>
      <h2>Who we are</h2>
      <p>
        {c.name} (company number {c.reg}, registered office {c.office}) is the controller of personal data collected through this website. Contact
        us about privacy at <ContactLink email={c.email} />.
      </p>

      <h2>What we collect and why</h2>
      <ul>
        <li><strong>Account data</strong> — name, email address and password (stored only as a secure hash) — to provide your account, orders and downloads.</li>
        <li><strong>Order data</strong> — products ordered, prices, order status and, where payment is taken, payment reference numbers from the payment provider — to deliver products, keep accounting records and handle refunds. We never receive your full card details.</li>
        <li><strong>Download records</strong> — when you download a product — to apply download limits and prevent misuse.</li>
        <li><strong>Messages</strong> — contact enquiries and support requests — to answer you.</li>
        <li><strong>Newsletter</strong> — your email address and the consent you gave — only if you opt in. You can unsubscribe at any time.</li>
        <li><strong>Security data</strong> — short-lived, hashed network identifiers used for rate limiting to protect our forms from abuse.</li>
      </ul>

      <h2>Legal bases (UK GDPR)</h2>
      <ul>
        <li><strong>Contract</strong> — to provide your account, orders, downloads and support.</li>
        <li><strong>Legal obligation</strong> — to keep accounting and tax records.</li>
        <li><strong>Legitimate interests</strong> — to keep the website secure, prevent fraud and answer enquiries.</li>
        <li><strong>Consent</strong> — for newsletter emails. You can withdraw consent at any time.</li>
      </ul>

      <h2>Who we share data with</h2>
      <ul>
        <li><strong>Supabase</strong> — our database, sign-in and file-storage provider. Data is stored on servers in the European Union (Ireland).</li>
        <li><strong>Our website hosting provider</strong> — to serve the website to your browser.</li>
        <li><strong>A payment provider</strong> — when online card payments are offered, payments are processed on the provider’s own secure pages.</li>
      </ul>
      <p>
        These providers act on our instructions under data-processing terms. Transfers to the European Union are covered by the UK’s adequacy
        regulations. We do not sell your personal data.
      </p>

      <h2>How long we keep data</h2>
      <ul>
        <li>Account data: while your account is open, and deleted within 30 days of an account-deletion request (except order records below).</li>
        <li>Order records: six years from the end of the financial year in which the order was placed, to meet UK tax and accounting requirements.</li>
        <li>Enquiries and support requests: up to 24 months after the last message.</li>
        <li>Newsletter data: until you unsubscribe.</li>
        <li>Rate-limiting records: no more than 24 hours.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You have the right to access, correct or delete your personal data, to restrict or object to its processing, to data portability, and to
        withdraw consent. Contact us at <ContactLink email={c.email} />. You can also complain to the Information Commissioner’s Office (ico.org.uk).
      </p>

      <h2>Cookies</h2>
      <p>See our <Link to="/cookies">Cookie Policy</Link>.</p>
    </LegalPage>
  );
}

export function RefundPolicy() {
  const c = useCompany();
  return (
    <LegalPage title="Refund and Cancellation Policy" description={`When refunds and cancellations apply to digital products from ${c.name}.`}>
      <h2>Before you complete an order</h2>
      <p>You can remove items from your cart or leave checkout at any time. Nothing is charged until an order is completed.</p>

      <h2>Your right to cancel</h2>
      <p>
        Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, consumers normally have 14 days to cancel
        an online order. For digital content supplied immediately, that right ends once supply begins with your express consent and your
        acknowledgement that you will lose the right to cancel. At checkout you give that consent and acknowledgement, and your files are made
        available straight away.
      </p>

      <h2>Faulty or incorrectly described products</h2>
      <p>
        Your rights under the Consumer Rights Act 2015 are not affected. If a product is faulty, incomplete or not as described, we will first try to
        fix or replace it. If we cannot do so within a reasonable time, or without significant inconvenience to you, you are entitled to a price
        reduction or a refund of up to the full price paid.
      </p>

      <h2>Other refunds we offer</h2>
      <ul>
        <li>If you were charged more than once for the same order.</li>
        <li>If you paid but the product could not be made available in your account and we cannot resolve it.</li>
      </ul>

      <h2>How to ask for a refund</h2>
      <p>
        Open a <Link to="/account/support">support request</Link> with your order number and a description of the problem, or contact us at{' '}
        <ContactLink email={c.email} />. Please tell us within 30 days of your order, or as soon as you notice a fault.
      </p>

      <h2>After a refund</h2>
      <p>
        Refunds are returned to the original payment method. When a refund is made, access to the refunded product is removed from your account and
        the licence for it ends. Orders completed without charge have no amount to refund.
      </p>
    </LegalPage>
  );
}

export function LicencePage() {
  const c = useCompany();
  return (
    <LegalPage title="Digital Product Licence" description={`What you can and cannot do with digital products from ${c.name}.`}>
      <p>
        This standard licence from {c.name} applies to every product unless its product page states otherwise. A copy is included in each download
        as <code>LICENSE.txt</code>.
      </p>
      <h2>Summary</h2>
      <div className="not-prose grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-semibold">You may</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Use the files in unlimited end products for yourself or clients</li>
            <li>Modify, adapt and combine the files</li>
            <li>Use them in commercial end products</li>
          </ul>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <p className="font-semibold">You may not</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Resell or give away the files as templates, kits or source code</li>
            <li>Upload them to marketplaces or public repositories</li>
            <li>Share your download access</li>
            <li>Claim authorship of the unmodified files</li>
          </ul>
        </div>
      </div>
      <h2>1. Grant</h2>
      <p>A non-exclusive, non-transferable, perpetual licence for one licensee — an individual, or one organisation — to use the files included in the product.</p>
      <h2>2. Permitted use</h2>
      <p>
        You may use the files to create an unlimited number of websites, applications, documents or other end products for yourself or your clients,
        and modify, adapt, translate and combine them with other work. End products may be commercial, provided the files are part of a finished end
        product and are not offered on their own.
      </p>
      <h2>3. Restrictions</h2>
      <p>
        You may not resell, sublicense, share, give away or redistribute the files, in original or modified form, as templates, themes, kits, stock
        items or source-code products; upload them where others can download them as stand-alone resources; share your download link or account;
        claim to be the original author of the unmodified files; or use them in unlawful or infringing products.
      </p>
      <h2>4. Client work</h2>
      <p>You may transfer an end product to a single client. The client may use and edit that end product but may not extract and redistribute the original files.</p>
      <h2>5. Third-party material</h2>
      <p>Unless a product’s README lists otherwise, products contain no third-party images, fonts or libraries.</p>
      <h2>6. Your statutory rights and termination</h2>
      <p>
        Nothing in this licence affects your statutory rights as a consumer. The licence ends automatically if you breach it, or if your order is
        refunded.
      </p>
      <h2>7. Governing law</h2>
      <p>This licence is governed by the law of England and Wales.</p>
    </LegalPage>
  );
}

export function CookiePolicy() {
  return (
    <LegalPage title="Cookie Policy" description="How this website uses cookies and browser storage.">
      <h2>Our approach</h2>
      <p>
        This website does not use advertising or analytics cookies and does not load third-party tracking scripts. It only uses storage that is
        strictly necessary for the website to work, which under the UK’s Privacy and Electronic Communications Regulations does not require consent.
      </p>
      <h2>Strictly necessary storage</h2>
      <ul>
        <li><strong>Sign-in session</strong> — stored in your browser’s local storage so you stay signed in. Removed when you sign out.</li>
        <li><strong>Guest cart</strong> — a list of product identifiers you added before signing in. It contains no prices or personal data and is moved into your account when you sign in.</li>
      </ul>
      <h2>Payment pages</h2>
      <p>When online card payments are offered, you will pay on the payment provider’s own website, which sets its own cookies under its own policy.</p>
      <h2>Managing storage</h2>
      <p>You can clear cookies and site data in your browser settings at any time. Doing so signs you out and empties a guest cart.</p>
      <p>If we introduce analytics, we will update this policy and ask for your consent first.</p>
    </LegalPage>
  );
}
