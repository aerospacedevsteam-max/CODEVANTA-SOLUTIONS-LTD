// Single source of truth for packaging the original product deliverables in
// product-sources/ into downloadable ZIP archives. Slugs match the seed data
// in supabase/migrations/20261028000004_initial_catalogue.sql.

export const products = [
  {
    slug: 'website-starter-collection',
    version: '1.0.0',
    folders: ['business-website-starter', 'service-business-starter', 'portfolio-starter', 'saas-landing-starter'],
    previewPages: ['business-website-starter/index.html', 'service-business-starter/index.html', 'portfolio-starter/index.html', 'saas-landing-starter/index.html'],
  },
  {
    slug: 'business-website-starter-kit',
    version: '1.0.0',
    folders: ['business-website-starter'],
    previewPages: ['business-website-starter/index.html', 'business-website-starter/services.html', 'business-website-starter/contact.html'],
  },
  {
    slug: 'saas-landing-page-starter-kit',
    version: '1.0.0',
    folders: ['saas-landing-starter'],
    previewPages: ['saas-landing-starter/index.html', 'saas-landing-starter/index.html#pricing', 'saas-landing-starter/components.html'],
  },
  {
    slug: 'admin-dashboard-ui-starter-kit',
    version: '1.0.0',
    folders: ['admin-dashboard-starter'],
    previewPages: ['admin-dashboard-starter/index.html', 'admin-dashboard-starter/orders.html', 'admin-dashboard-starter/settings.html'],
  },
  {
    slug: 'ecommerce-ui-starter-kit',
    version: '1.0.0',
    folders: ['ecommerce-ui-starter'],
    previewPages: ['ecommerce-ui-starter/products.html', 'ecommerce-ui-starter/product.html', 'ecommerce-ui-starter/checkout.html'],
  },
  {
    slug: 'portfolio-website-starter-kit',
    version: '1.0.0',
    folders: ['portfolio-starter'],
    previewPages: ['portfolio-starter/index.html', 'portfolio-starter/project.html'],
  },
  {
    slug: 'small-business-finance-tracker',
    version: '1.0.0',
    folders: ['small-business-finance-tracker'],
    workbook: 'small-business-finance-tracker/Small-Business-Finance-Tracker.xlsx',
    previewSheets: ['Dashboard', 'Monthly Summary', 'Income'],
  },
  {
    slug: 'freelance-project-management-template',
    version: '1.0.0',
    folders: ['freelance-project-management-template'],
    workbook: 'freelance-project-management-template/Freelance-Project-Tracker.xlsx',
    previewSheets: ['Overview', 'Projects', 'Tasks'],
  },
  {
    slug: 'developer-portfolio-components-pack',
    version: '1.0.0',
    folders: ['developer-portfolio-components'],
    previewPages: ['developer-portfolio-components/demo/index.html'],
  },
  {
    slug: 'small-business-website-bundle',
    version: '1.0.0',
    folders: ['business-website-starter', 'portfolio-starter', 'saas-landing-starter'],
    previewPages: ['business-website-starter/about.html', 'portfolio-starter/index.html', 'saas-landing-starter/index.html'],
  },
];

export const zipName = (p) => `${p.slug}-v${p.version}.zip`;
