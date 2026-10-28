// Initial catalogue content (original copy). `npm run seed:generate` turns this
// into supabase/migrations/20261028000004_initial_catalogue.sql.
// Prices are the proposed launch prices from the brief and are editable in /admin.

const LICENCE = `Standard single-licensee licence (CODEVANTASOLUTIONSLTD Digital Product Licence v1.0).
You may: use the files in unlimited end products for yourself or your clients; modify and combine them; use them in commercial end products.
You may not: resell, share or redistribute the files as templates, kits or source code; upload them to marketplaces or public repositories; share your download access.
The full licence is included in the download as LICENSE.txt and published at /licence.`;

const SUPPORT = 'Questions about setup or a problem with the files? Open a support request from your account and include your order number.';

const WEB_REQS = ['A modern web browser', 'A code editor to customise the files', 'Any static web host (no build step, no server-side code)', 'A form backend or form service if you want contact forms to send messages'];

const htmlChecks = (pages) => [
  'Written for current versions of Chrome, Edge, Firefox and Safari',
  `HTML validated with html-validate (recommended rules): 0 errors on ${pages}`,
  'All JavaScript passes a syntax check; no external CDNs, fonts or tracking',
];

export const categories = [
  ['Website Templates', 'website-templates', 'Responsive, original website layouts for businesses, portfolios and landing pages.', 'layout-template'],
  ['UI Kits & Design Resources', 'ui-kits', 'Interface building blocks: components, patterns and page layouts.', 'palette'],
  ['Admin Dashboards', 'admin-dashboards', 'Dashboard layouts with navigation, tables, filters and charts.', 'layout-dashboard'],
  ['Business Website Kits', 'business-website-kits', 'Multi-page starting points for company and service websites.', 'briefcase'],
  ['E-commerce Resources', 'ecommerce-resources', 'Product listing, product detail, cart and checkout interfaces.', 'shopping-cart'],
  ['SaaS Starter Resources', 'saas-resources', 'Landing pages, pricing tables and feature sections for software products.', 'rocket'],
  ['Business Templates', 'business-templates', 'Spreadsheets and trackers for finances, projects and day-to-day operations.', 'file-spreadsheet'],
  ['Developer Resources', 'developer-resources', 'Reusable components and code resources for developers.', 'code-2'],
  ['Bundles', 'bundles', 'Collections of related products sold together under one licence.', 'boxes'],
];

export const products = [
  {
    slug: 'website-starter-collection',
    title: 'Website Starter Collection',
    subtitle: 'Four original website starter kits — business, service, portfolio and SaaS landing page — in one download.',
    short_description: 'A starter collection of original website layouts for business, portfolio, landing-page and service-based websites.',
    product_type: 'Template bundle',
    price: 289,
    category: 'website-templates',
    also: ['business-website-kits', 'bundles'],
    featured: true,
    highlights: [
      '4 complete, original starter kits (10 HTML pages in total)',
      'Business, service business, portfolio and SaaS landing page designs',
      'Responsive layouts and accessible navigation in every kit',
      'Plain HTML, CSS and JavaScript — no build step',
      'Rebrand each kit from one block of CSS variables',
      'README with setup and customisation steps for each kit',
    ],
    description: `The Website Starter Collection brings together four of our original website starter kits so you can start a business site, a service company site, a personal portfolio or a software landing page from a solid, tested base.

Every kit is written in plain HTML, CSS and JavaScript with no frameworks and no build step: open the files, change the content and deploy to any static host. Each design has its own visual identity, a responsive layout, a keyboard-accessible mobile menu and colours controlled from a single block of CSS custom properties.

Included kits:
• Business Website Starter — home, about, services and contact pages with an FAQ accordion and a validated contact form.
• Service Business Starter — a one-page site for a home-services or consulting business with pricing-style service cards, a process section, service areas, an FAQ and a booking enquiry form.
• Portfolio Starter — a personal portfolio with filterable project cards, skills, an experience timeline, a case-study page and a light/dark theme toggle.
• SaaS Landing Page Starter — a landing page with a product UI mock, feature sections, a monthly/yearly pricing table, FAQ and a documented components page.

All copy, names and illustrations are original placeholders for you to replace. Contact and booking forms validate input in the browser and need a form service or your own backend to send messages — each README explains the options.`,
    contents: [
      ['business-website-starter/', 'Home, about, services and contact pages + CSS/JS + README'],
      ['service-business-starter/', 'One-page service business site + thank-you page + CSS/JS + README'],
      ['portfolio-starter/', 'Portfolio home page + case-study template + theme toggle + README'],
      ['saas-landing-starter/', 'SaaS landing page + components reference page + pricing logic + README'],
      ['README.md', 'Overview of the collection'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    compatibility: [...htmlChecks('all 10 HTML pages'), 'Business, service and portfolio kits rendered in headless Chrome at 320–1440px with no horizontal scrolling'],
    faq: [
      ['Is this the same as buying the four kits separately?', 'Yes — the collection contains the same files as the individual Business, Service Business, Portfolio and SaaS Landing Page kits, in one download and under one licence.'],
      ['Do I need to know a framework?', 'No. The kits are plain HTML, CSS and JavaScript. Basic HTML/CSS knowledge is enough to customise them.'],
      ['Will the contact forms send email?', 'Not on their own. Forms validate input in the browser; connect them to a form service or your own server as described in each README.'],
    ],
  },
  {
    slug: 'business-website-starter-kit',
    title: 'Business Website Starter Kit',
    subtitle: 'A four-page, responsive company website you can rebrand in minutes.',
    short_description: 'An original multi-page business website with home, about, services and contact pages, responsive navigation and documentation.',
    product_type: 'Website template',
    price: 199,
    category: 'website-templates',
    also: ['business-website-kits'],
    featured: true,
    highlights: ['Home, about, services and contact pages', 'Keyboard-accessible mobile navigation', 'FAQ accordion and validated contact form', 'Theme colours from one CSS variables block', 'No frameworks, no build step', 'Setup and customisation README'],
    description: `A clean, professional starting point for a small company or agency website. The kit includes four linked pages that share one stylesheet and one script, so changes to colours, fonts and navigation apply everywhere.

The home page has a hero, a services overview, a values and team section and a clearly marked placeholder testimonials area. The about page tells your company story, the services page presents each offering in detail with an FAQ, and the contact page includes a contact form with accessible, in-browser validation.

Accessibility is built in: a skip link, labelled landmarks, visible focus styles, a mobile menu that announces its state and closes with Escape, and error messages linked to their fields. All text and illustrations are original placeholders, and the README explains how to change content, colours and fonts and how to connect the form to a form service or your own backend.`,
    contents: [
      ['index.html', 'Home page'],
      ['about.html', 'About page'],
      ['services.html', 'Services page with FAQ'],
      ['contact.html', 'Contact page with validated form'],
      ['assets/css/styles.css', 'All styles; theme variables in :root'],
      ['assets/js/main.js', 'Mobile menu, FAQ and form validation'],
      ['README.md', 'Setup, customisation and form-backend options'],
      ['CHANGELOG.md', 'Version history'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    compatibility: [...htmlChecks('all 4 pages'), 'Rendered in headless Chrome at 320, 375, 768, 1024 and 1440px with no horizontal scrolling'],
    faq: [
      ['Can I add more pages?', 'Yes. Copy any page, keep the shared header and footer, and update the navigation links in each file.'],
      ['Does the contact form work out of the box?', 'It validates input and shows a local demo confirmation. To actually send messages, connect it to a form service or your own backend (see README).'],
    ],
  },
  {
    slug: 'saas-landing-page-starter-kit',
    title: 'SaaS Landing Page Starter Kit',
    subtitle: 'Feature sections, pricing with a monthly/yearly toggle, FAQ and CTA blocks for a software product.',
    short_description: 'An original SaaS landing page with feature sections, a pricing layout with billing toggle, FAQ and call-to-action components.',
    product_type: 'Landing page template',
    price: 249,
    category: 'saas-resources',
    also: ['website-templates'],
    featured: true,
    highlights: ['Hero with a product UI mock built in HTML/CSS', 'Feature grid and alternating feature rows', 'Pricing table with accessible monthly/yearly toggle', 'Keyboard-operable FAQ accordion', 'Components page documenting every block', 'No external dependencies'],
    description: `Launch a page for your software product with a layout that explains the product, shows its value and converts visitors.

The landing page includes a sticky header with a mobile menu, a hero with a product interface mock drawn in HTML and CSS (no screenshots needed), a placeholder logo strip, a feature grid, alternating media/text feature rows, a comparison list, a pricing table with a monthly/yearly switch, an FAQ accordion with full keyboard support, a final call to action and a footer.

A separate components page documents each section as a reusable block with copy-and-paste notes, so you can assemble additional pages. The pricing calculation lives in its own small script, and the yearly discount is set with a single data attribute. All brand names and copy are original placeholders.`,
    contents: [
      ['index.html', 'Complete landing page'],
      ['components.html', 'Reference page documenting each reusable section'],
      ['assets/css/styles.css', 'Styles and theme variables'],
      ['assets/js/main.js', 'Navigation, FAQ accordion and interactions'],
      ['assets/js/pricing.js', 'Monthly/yearly pricing calculation'],
      ['README.md', 'Setup and customisation guide'],
      ['CHANGELOG.md', 'Version history'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    compatibility: [...htmlChecks('both pages'), 'Pricing logic covered by scripted unit checks; page interactions exercised in a scripted DOM test'],
    faq: [['How do I change the prices?', 'Edit the data attributes on each pricing card; the yearly discount is a single data-discount value. See README.'], ['Can I use it for a client’s product?', 'Yes, the licence allows client end products.']],
  },
  {
    slug: 'admin-dashboard-ui-starter-kit',
    title: 'Admin Dashboard UI Starter Kit',
    subtitle: 'Sidebar navigation, metric cards, SVG charts, a sortable data table and settings layouts.',
    short_description: 'Original admin dashboard layouts with collapsible sidebar, metric cards, chart examples, filterable tables and settings forms.',
    product_type: 'UI kit',
    price: 299,
    category: 'admin-dashboards',
    also: ['ui-kits'],
    featured: true,
    highlights: ['Overview, orders and settings pages', 'Collapsible sidebar and responsive mobile drawer', 'Line and bar charts drawn as SVG from data — no chart library', 'Orders table with search, status filter, sorting and pagination', 'Charts include text summaries and data tables for accessibility', 'Fictional sample data you can replace with your API'],
    description: `A dependency-free starting point for internal tools and admin panels.

The overview page combines metric cards with a line chart and a bar chart that are generated as inline SVG from a plain data array, each with a written summary and an optional data table for screen-reader users. The orders page includes a data table with client-side search, status filter, sortable columns (with aria-sort) and pagination with selectable page sizes. The settings page shows tabs, form layouts and toggle switches.

The sidebar collapses to icons on desktop and becomes a slide-in drawer on mobile. Filtering, sorting, pagination and chart scaling are written as small pure functions in a separate file so you can test them or reuse them with real data from your own API. All business names and figures are fictional.`,
    contents: [
      ['index.html', 'Overview: metric cards and charts'],
      ['orders.html', 'Orders table with search, filter, sort and pagination'],
      ['settings.html', 'Settings tabs, forms and toggles'],
      ['assets/css/dashboard.css', 'Layout, components and theme variables'],
      ['assets/js/app.js', 'Sidebar, tabs and shared UI behaviour'],
      ['assets/js/charts.js', 'SVG line and bar chart rendering'],
      ['assets/js/orders.js', 'Orders table controller'],
      ['assets/js/logic.js', 'Pure filter, sort, paginate and scale functions'],
      ['assets/js/data.js', 'Fictional sample data'],
      ['README.md', 'Setup and guide to connecting real data'],
      ['CHANGELOG.md', 'Version history'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    compatibility: [...htmlChecks('all 3 pages'), 'Table and chart logic covered by scripted unit checks; pages exercised in a scripted DOM test', 'Colour contrast pairs calculated against WCAG AA'],
    faq: [['Does it include authentication?', 'No. It is a front-end UI kit; add authentication with your own backend.'], ['Which chart library does it use?', 'None. Charts are drawn as inline SVG by a small script you can extend.']],
  },
  {
    slug: 'ecommerce-ui-starter-kit',
    title: 'E-commerce UI Starter Kit',
    subtitle: 'Product listing, product detail, cart and multi-step checkout interfaces.',
    short_description: 'Original e-commerce UI: product listing with filters, product detail, a working cart and a multi-step checkout layout.',
    product_type: 'UI kit',
    price: 299,
    category: 'ui-kits',
    also: ['ecommerce-resources'],
    featured: false,
    highlights: ['Product grid with filters and sorting', 'Product page with gallery, variants and tabs', 'Cart with live totals (integer-cent maths)', 'Multi-step checkout layout with a clearly marked payment placeholder', 'Order confirmation page', '12 original SVG product illustrations'],
    description: `The front-end screens for an online shop, ready to connect to your own catalogue and payment provider.

The listing page has a filter sidebar that becomes a drawer on mobile and a working sort control over sample data. The product page includes an image gallery with thumbnails, variant selectors, quantity input, add-to-cart and content tabs. The cart updates quantities and totals live using integer-cent arithmetic and keeps working even when browser storage is unavailable. The checkout is a multi-step layout covering contact, address and delivery, followed by a clearly labelled payment placeholder: it deliberately contains no card fields, because payments must be handled by a real payment provider’s hosted or embedded checkout. An order confirmation page completes the flow.

Prices are always read from the catalogue, never from browser storage, and tampered carts are cleaned automatically. All products, brand names and illustrations are original and fictional.`,
    contents: [
      ['products.html', 'Product listing with filters and sort'],
      ['product.html', 'Product detail with gallery and variants'],
      ['cart.html', 'Cart with live totals'],
      ['checkout.html', 'Multi-step checkout layout (payment placeholder)'],
      ['order-confirmation.html', 'Confirmation page'],
      ['assets/css/shop.css', 'Styles and theme variables'],
      ['assets/js/*.js', 'Catalogue, cart core, page controllers (8 files)'],
      ['README.md', 'Setup and guide to connecting a backend and payment provider'],
      ['CHANGELOG.md', 'Version history'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    compatibility: [...htmlChecks('all 5 pages'), 'Cart maths covered by scripted unit checks; full add-to-cart → checkout → confirmation flow exercised in a scripted DOM test'],
    faq: [['Does it take payments?', 'No. It is a UI kit. Integrate a payment provider’s hosted or embedded checkout; the payment step is a labelled placeholder.'], ['Can I connect it to my product database?', 'Yes — replace the sample catalogue in catalog.js with data from your API (see README).']],
  },
  {
    slug: 'portfolio-website-starter-kit',
    title: 'Portfolio Website Starter Kit',
    subtitle: 'A personal portfolio with filterable projects, skills, experience timeline and a case-study page.',
    short_description: 'An original portfolio layout with filterable project cards, skills, biography, experience timeline and contact section.',
    product_type: 'Website template',
    price: 149,
    category: 'website-templates',
    also: [],
    featured: false,
    highlights: ['Hero with short biography', 'Project cards with tag filter and live result count', 'Skills section and experience timeline', 'Case-study page template', 'Light/dark theme that remembers the visitor’s choice', 'Validated contact form'],
    description: `Present your work clearly with a portfolio that is quick to customise and easy to maintain.

The main page includes a hero with your biography, project cards that visitors can filter by tag (with an announced result count for screen-reader users), a skills section, an experience timeline and a contact form with in-browser validation. A separate case-study page gives each project room for context, process and results.

A light/dark theme toggle follows the visitor’s system setting by default and remembers their choice, without a flash of the wrong theme on page load. All names and projects are placeholders, and the README explains how to add projects, change the colours and connect the contact form.`,
    contents: [
      ['index.html', 'Portfolio home page'],
      ['project.html', 'Case-study page template'],
      ['assets/css/styles.css', 'Styles with light and dark theme variables'],
      ['assets/js/theme.js', 'Theme preference (loaded early to avoid flashes)'],
      ['assets/js/main.js', 'Project filter, navigation and form validation'],
      ['README.md', 'Setup and customisation guide'],
      ['CHANGELOG.md', 'Version history'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    compatibility: [...htmlChecks('both pages'), 'Rendered in headless Chrome at 320–1440px with no horizontal scrolling; filter and theme toggle exercised in a scripted test'],
    faq: [['How do I add a project?', 'Copy a project card and set its data-tags attribute; the filter picks it up automatically.']],
  },
  {
    slug: 'small-business-finance-tracker',
    title: 'Small Business Finance Tracker',
    subtitle: 'Track income and expenses, see monthly and category summaries and a one-page dashboard.',
    short_description: 'An original Excel-compatible spreadsheet for income, expenses, monthly summaries, category totals and a dashboard.',
    product_type: 'Spreadsheet template',
    price: 199,
    category: 'business-templates',
    also: [],
    featured: true,
    highlights: ['Income and expense tables with category drop-downs', 'Monthly summary for any financial-year start month', 'Category summary with share of total', 'Dashboard with key figures, best/worst month and in-cell bars', 'Clearly labelled sample data to delete', 'All 276 formulas verified by an automated recalculation test'],
    description: `A practical spreadsheet for sole traders and small businesses that want a clear view of money in and money out.

Enter income and expenses in two tables with drop-down categories and payment methods. The workbook then builds a 12-month summary from the financial-year start month you choose, totals by category with each category’s share, and a dashboard showing total income, expenses, net profit, expense ratio, profit margin, best and worst months and simple in-cell bar visuals.

The Start Here sheet explains every step. Settings let you set your business name, currency label, financial year and category lists. Formulas use ranges that cover the first 1,000 rows and avoid newer functions, so the file works in Excel 2016 and later and in compatible spreadsheet apps. Sample entries are clearly marked so you can delete them before use.

Quality check: every formula was recalculated by an automated test and compared with independently calculated totals across several scenarios (different year start, empty data, new categories). The workbook recalculates when opened.`,
    contents: [
      ['Small-Business-Finance-Tracker.xlsx', '7 sheets: Start Here, Settings, Income, Expenses, Monthly Summary, Category Summary, Dashboard'],
      ['README.md', 'Sheet-by-sheet guide'],
      ['CHANGELOG.md', 'Version history'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    requirements: ['Microsoft Excel 2016 or later, or a compatible spreadsheet app that opens .xlsx files'],
    compatibility: ['Built for Microsoft Excel 2016+ and compatible spreadsheet apps', 'Formulas verified with an automated recalculation test (276 formulas, 0 errors)'],
    faq: [['Does it calculate tax?', 'No. It totals tax-deductible expenses you mark, but it is not tax software. Ask your accountant about tax.'], ['Can I add more categories?', 'Yes — up to 20 per list on the Settings sheet; drop-downs and summaries update automatically.']],
  },
  {
    slug: 'freelance-project-management-template',
    title: 'Freelance Project Management Template',
    subtitle: 'Clients, projects, tasks, deadlines and progress in one spreadsheet.',
    short_description: 'An original project tracker with task status, deadlines, priorities, client information and automatic progress tracking.',
    product_type: 'Spreadsheet template',
    price: 149,
    category: 'business-templates',
    also: [],
    featured: false,
    highlights: ['Clients, projects and tasks linked by ID', 'Project % complete calculated from tasks', 'Days-overdue and upcoming-deadline tracking', 'Overview with counts by status and priority', 'Conditional formatting for overdue work', 'All formulas verified by an automated recalculation test'],
    description: `Keep freelance work organised without a subscription tool.

Add clients once, link projects to clients by ID, and list tasks against each project with owner, status, priority, due date and done date. The workbook looks up client names, calculates each project’s percentage complete from its tasks, flags overdue tasks with the number of days overdue, and highlights work due soon.

The Overview sheet counts tasks and projects by status and priority, shows open and overdue tasks and lists deadlines within a window you choose (14 days by default) relative to today’s date. Drop-down lists keep statuses and priorities consistent, and conditional formatting makes overdue work stand out. Formulas cover the first 1,000 rows and avoid newer spreadsheet functions for broad compatibility.

Quality check: every formula was recalculated by an automated test against independently calculated counts at several fixed report dates.`,
    contents: [
      ['Freelance-Project-Tracker.xlsx', '5 sheets: Start Here, Overview, Clients, Projects, Tasks'],
      ['README.md', 'Sheet-by-sheet guide'],
      ['CHANGELOG.md', 'Version history'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    requirements: ['Microsoft Excel 2016 or later, or a compatible spreadsheet app that opens .xlsx files'],
    compatibility: ['Built for Microsoft Excel 2016+ and compatible spreadsheet apps', 'Formulas verified with an automated recalculation test (4,028 formulas, 0 errors)'],
    faq: [['Can I track hours or invoices?', 'Not in this version. It focuses on projects, tasks, deadlines and progress.']],
  },
  {
    slug: 'developer-portfolio-components-pack',
    title: 'Developer Portfolio Components Pack',
    subtitle: 'Framework-free Web Components for hero, projects, skills, timeline, contact form and theme toggle.',
    short_description: 'Original reusable portfolio UI components built as standard Web Components, with a demo page and documentation.',
    product_type: 'Component library',
    price: 199,
    category: 'developer-resources',
    also: ['ui-kits'],
    featured: false,
    highlights: ['7 Custom Elements with Shadow DOM — no dependencies', 'Works with plain HTML or inside any framework', 'Filterable project grid with keyboard navigation', 'Contact form that emits an event — you choose how to send', 'Theme via CSS custom properties, light and dark', 'One documentation page per component'],
    description: `A set of standard Web Components for building a developer portfolio, usable in plain HTML pages or alongside React, Vue, Svelte or any other framework.

Components: <cv-hero>, <cv-project-card>, <cv-project-grid> (with tag filtering and arrow-key navigation), <cv-skill-list>, <cv-timeline> with <cv-timeline-item>, <cv-contact-form> and <cv-theme-toggle>. Each component uses Shadow DOM, exposes CSS custom properties and ::part hooks for styling, respects reduced-motion preferences and ships with accessible labels and focus styles.

The contact form validates input and dispatches a cv-submit event with the form data instead of sending it anywhere; the documentation shows how to connect it to fetch, a form service or mailto. Pure helper functions (filtering, validation, theme choice) are kept in a separate module. A demo page shows every component together.

Note: browsers do not load ES modules from file:// URLs, so open the demo through any local web server (instructions in the README).`,
    contents: [
      ['components/', '7 component modules, index.js, utils.js, styles.js, theme.css'],
      ['demo/', 'Demo page using every component, with original SVG artwork'],
      ['docs/', 'One page per component plus theming guide'],
      ['README.md', 'Installation, usage and browser support'],
      ['CHANGELOG.md', 'Version history'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    requirements: ['A modern browser with Custom Elements and ES module support', 'A local web server to view the demo (e.g. npx serve)', 'No build tools or npm packages required'],
    compatibility: ['Written for current versions of Chrome, Edge, Firefox and Safari', 'Demo HTML validated with html-validate: 0 errors', 'Helper functions unit-tested; components exercised in a scripted DOM test; demo rendered in headless Chrome'],
    faq: [['Can I use these in React?', 'Yes. Custom Elements work in React and other frameworks; listen for the cv-submit event on the contact form.']],
  },
  {
    slug: 'small-business-website-bundle',
    title: 'Small Business Website Bundle',
    subtitle: 'Business website, portfolio and landing-page starter kits in one download.',
    short_description: 'A verified selection of our original business website, portfolio and landing-page starter kits under one licence.',
    product_type: 'Template bundle',
    price: 399,
    category: 'bundles',
    also: ['website-templates', 'business-website-kits'],
    featured: false,
    highlights: ['Business Website Starter Kit (4 pages)', 'Portfolio Website Starter Kit (2 pages)', 'SaaS Landing Page Starter Kit (2 pages)', 'One licence covering all three kits'],
    description: `A bundle for small businesses and freelancers who need a company website, a portfolio of work and a landing page for a product or campaign.

It contains three of our original starter kits, each in its own folder with its own README: the Business Website Starter Kit (home, about, services and contact), the Portfolio Website Starter Kit (portfolio and case-study pages with a theme toggle) and the SaaS Landing Page Starter Kit (landing page with pricing and FAQ, plus a components reference page).

All three are plain HTML, CSS and JavaScript with no build step, responsive layouts, accessible navigation and theme colours controlled from CSS variables. See each kit’s own product page for full details.`,
    contents: [
      ['business-website-starter/', 'Business Website Starter Kit'],
      ['portfolio-starter/', 'Portfolio Website Starter Kit'],
      ['saas-landing-starter/', 'SaaS Landing Page Starter Kit'],
      ['README.md', 'Overview of the bundle'],
      ['LICENSE.txt', 'Standard single-licensee licence'],
    ],
    compatibility: [...htmlChecks('all 8 HTML pages')],
    faq: [['How is this different from the Website Starter Collection?', 'The Website Starter Collection also includes the Service Business Starter. Compare the contents lists before buying.']],
  },
].map((p) => ({
  version: '1.0.0',
  requirements: WEB_REQS,
  licence_text: LICENCE,
  support_info: SUPPORT,
  ...p,
}));
