// @vitest-environment jsdom
/**
 * Renders every route of the storefront, account area and admin area against a
 * mocked data layer, and checks key behaviours (honest pricing, disabled
 * payments, payment confirmation only from server state, access control).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------- fixtures
const cat = { id: 'c1', name: 'Website Templates', slug: 'website-templates', description: 'Layouts', icon: 'layout-template', image_path: null, is_published: true, display_order: 10, archived_at: null };
const base = {
  subtitle: 'Sub', short_description: 'A complete original starter kit.', product_type: 'Website template', currency: 'INR', original_price: null as number | null,
  preview_images: ['/previews/x.jpg'], is_featured: true, version: '1.0.0', created_at: '2026-10-01T00:00:00Z', category_name: 'Website Templates', category_slug: 'website-templates',
};
const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';
const published = { ...base, id: P1, title: 'Business Website Starter Kit', slug: 'business-website-starter-kit', price: 199, status: 'published' as const };
const soon = { ...base, id: P2, title: 'Website Starter Collection', slug: 'website-starter-collection', price: 289, status: 'coming_soon' as const };
const detail = {
  ...published, description: 'Long description of the kit.', highlights: ['Four pages'], contents: [{ name: 'index.html', description: 'Home' }],
  technical_requirements: ['A browser'], compatibility: ['Chrome'], faq: [{ question: 'Q?', answer: 'A.' }], licence_text: 'Licence text', support_info: null,
  category_id: 'c1', seo_title: null, seo_description: null, published_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-02T00:00:00Z',
};
const order = { id: 'o1', order_number: 'CV-2610-1001', customer_id: 'u1', customer_email: 'a@b.co', subtotal: 199, discount_amount: 0, total: 199, currency: 'INR', payment_provider: 'razorpay', provider_order_id: 'plink_1', payment_status: 'pending', paid_at: null, refunded_at: null, created_at: '2026-10-03T00:00:00Z', order_items: [{ id: 'i1', product_id: P1, product_title_snapshot: 'Business Website Starter Kit', unit_price: 199, currency: 'INR', quantity: 1 }] };

const api = vi.hoisted(() => ({
  fetchSettings: vi.fn(), fetchCategories: vi.fn(), searchProducts: vi.fn(), fetchFeaturedProducts: vi.fn(), fetchNewArrivals: vi.fn(),
  fetchBestsellers: vi.fn(), fetchProduct: vi.fn(), fetchRelated: vi.fn(), fetchProductsByIds: vi.fn(), fetchReviewSummary: vi.fn(),
  fetchReviews: vi.fn(), canReview: vi.fn(), submitReview: vi.fn(), fetchMyReview: vi.fn(), quoteOrder: vi.fn(), startCheckout: vi.fn(),
  fetchOrderByNumber: vi.fn(), submitEnquiry: vi.fn(), subscribeNewsletter: vi.fn(), fetchMyOrders: vi.fn(), fetchMyOrder: vi.fn(),
  fetchMyEntitlements: vi.fn(), requestDownload: vi.fn(), fetchMySupportRequests: vi.fn(), createSupportRequest: vi.fn(), updateMyName: vi.fn(),
  fetchServerCart: vi.fn(), addServerCartItems: vi.fn(), removeServerCartItem: vi.fn(), clearServerCart: vi.fn(),
}));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), ...api }));

const admin = vi.hoisted(() => ({
  fetchDashboardStats: vi.fn(), fetchRecentOrders: vi.fn(), fetchOrders: vi.fn(), fetchOrderAdmin: vi.fn(), updateEntitlement: vi.fn(),
  fetchAllProducts: vi.fn(), fetchProductAdmin: vi.fn(), saveProduct: vi.fn(), setSecondaryCategories: vi.fn(), setProductStatus: vi.fn(),
  uploadPreviewImage: vi.fn(), uploadProductFile: vi.fn(), fetchAllCategories: vi.fn(), saveCategory: vi.fn(), reorderCategories: vi.fn(),
  fetchReviewsAdmin: vi.fn(), moderateReview: vi.fn(), deleteReview: vi.fn(), saveSetting: vi.fn(), searchCustomers: vi.fn(),
  fetchCustomerOrders: vi.fn(), fetchEnquiries: vi.fn(), setEnquiryStatus: vi.fn(), fetchSupportAdmin: vi.fn(), replySupport: vi.fn(), fetchAuditLog: vi.fn(),
}));
vi.mock('@/lib/adminApi', () => admin);

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: null,
  siteUrl: 'https://shop.example',
  functionsUrl: '',
  ConfigError: class ConfigError extends Error {},
  db: () => { throw new Error('db() must not be called directly in UI tests'); },
}));

const auth = vi.hoisted(() => ({ state: { user: null as null | Record<string, unknown>, profile: null as null | Record<string, unknown>, isAdmin: false, loading: false } }));
vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ ...auth.state, session: null, refreshProfile: vi.fn(), signOut: vi.fn() }),
}));

import App from '@/App';
import { SettingsProvider } from '@/context/SettingsContext';
import { CartProvider } from '@/context/CartContext';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </SettingsProvider>
    </MemoryRouter>,
  );
}

const quote = (items = [published]) => ({
  items: items.map((p) => ({ product_id: p.id, title: p.title, slug: p.slug, unit_price: p.price, currency: 'INR', preview_image: null, product_type: p.product_type })),
  unavailable: [], currency: 'INR', subtotal: items.reduce((s, p) => s + p.price, 0), discount: 0, total: items.reduce((s, p) => s + p.price, 0), coupon: null,
});

beforeEach(() => {
  localStorage.clear();
  auth.state = { user: null, profile: null, isAdmin: false, loading: false };
  api.fetchSettings.mockResolvedValue({});
  api.fetchCategories.mockResolvedValue([cat]);
  api.searchProducts.mockResolvedValue({ total: 2, page: 1, page_size: 12, items: [published, soon] });
  api.fetchFeaturedProducts.mockResolvedValue([published, soon]);
  api.fetchNewArrivals.mockResolvedValue([published]);
  api.fetchBestsellers.mockResolvedValue([]);
  api.fetchProduct.mockImplementation(async (slug: string) => (slug === detail.slug ? detail : slug === soon.slug ? { ...detail, ...soon } : null));
  api.fetchRelated.mockResolvedValue([soon]);
  api.fetchReviewSummary.mockResolvedValue({ count: 0, average: null });
  api.fetchReviews.mockResolvedValue([]);
  api.quoteOrder.mockImplementation(async (ids: string[]) => quote(ids.includes(P1) ? [published] : []));
  api.fetchOrderByNumber.mockResolvedValue(order);
  api.fetchMyOrders.mockResolvedValue([order]);
  api.fetchMyOrder.mockResolvedValue(order);
  api.fetchMyEntitlements.mockResolvedValue([]);
  api.fetchMySupportRequests.mockResolvedValue([]);
  api.fetchServerCart.mockResolvedValue([]);
  api.addServerCartItems.mockResolvedValue(undefined);
  admin.fetchDashboardStats.mockResolvedValue({ products_total: 10, products_published: 0, products_draft: 0, products_coming_soon: 10, orders_total: 0, orders_paid: 0, revenue: {}, enquiries_new: 0, reviews_pending: 0, support_open: 0 });
  admin.fetchRecentOrders.mockResolvedValue([]);
  admin.fetchOrders.mockResolvedValue([order]);
  admin.fetchOrderAdmin.mockResolvedValue({ order, events: [], downloads: [] });
  admin.fetchAllProducts.mockResolvedValue([{ ...detail, category: cat, file: null }]);
  admin.fetchProductAdmin.mockResolvedValue({ product: { ...detail, file: null }, secondaryCategoryIds: [] });
  admin.fetchAllCategories.mockResolvedValue([cat]);
  admin.fetchReviewsAdmin.mockResolvedValue([]);
  admin.searchCustomers.mockResolvedValue([]);
  admin.fetchEnquiries.mockResolvedValue([]);
  admin.fetchSupportAdmin.mockResolvedValue([]);
  admin.fetchAuditLog.mockResolvedValue([]);
});
afterEach(cleanup);

const signIn = (isAdmin = false) => {
  auth.state = { user: { id: 'u1', email: 'a@b.co', email_confirmed_at: '2026-10-01' }, profile: { id: 'u1', full_name: 'Asha Rao', role: isAdmin ? 'admin' : 'customer' }, isAdmin, loading: false };
};

const heading = (name: RegExp | string) => screen.findByRole('heading', { level: 1, name });

describe('public routes render', () => {
  const cases: [string, RegExp][] = [
    ['/', /Digital Resources to Build/],
    ['/products', /All products/],
    ['/categories/website-templates', /Website Templates/],
    ['/products/business-website-starter-kit', /Business Website Starter Kit/],
    ['/search?q=kit', /Search results for “kit”/],
    ['/cart', /Shopping cart/],
    ['/checkout/cancelled', /Payment not completed/],
    ['/signin', /Sign in/],
    ['/register', /Create your account/],
    ['/forgot-password', /Reset your password/],
    ['/reset-password', /Choose a new password/],
    ['/about', /About CODEVANTASOLUTIONSLTD/],
    ['/contact', /Contact us/],
    ['/faqs', /Frequently asked questions/],
    ['/support', /Support centre/],
    ['/privacy', /Privacy Policy/],
    ['/terms', /Terms and Conditions/],
    ['/refund-policy', /Refund and Cancellation Policy/],
    ['/licence', /Digital Product Licence/],
    ['/cookies', /Cookie Policy/],
    ['/does-not-exist', /couldn’t find that page/],
    ['/products/unknown-slug', /couldn’t find that page/],
  ];
  it.each(cases)('%s', async (path, name) => {
    renderAt(path);
    expect(await heading(name)).toBeInTheDocument();
  });

  it('checkout shows an empty-cart state when nothing is in the cart', async () => {
    renderAt('/checkout');
    expect(await screen.findByText(/Your cart is empty/)).toBeInTheDocument();
  });
});

describe('account routes', () => {
  it('redirects signed-out visitors to sign in', async () => {
    renderAt('/account/downloads');
    expect(await heading(/Sign in/)).toBeInTheDocument();
  });

  it.each([
    ['/account', /Hello, Asha/],
    ['/account/orders', /Order history/],
    ['/account/orders/o1', /Order CV-2610-1001/],
    ['/account/downloads', /Purchased products & downloads/],
    ['/account/support', /Support requests/],
  ])('%s renders for a signed-in customer', async (path, name) => {
    signIn();
    renderAt(path);
    expect(await heading(name)).toBeInTheDocument();
  });
});

describe('admin routes', () => {
  it('denies customers', async () => {
    signIn(false);
    renderAt('/admin');
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(admin.fetchDashboardStats).not.toHaveBeenCalled();
  });

  it.each([
    ['/admin', /Dashboard/],
    ['/admin/products', /Products/],
    ['/admin/products/p1', /Business Website Starter Kit/],
    ['/admin/products/new', /New product/],
    ['/admin/categories', /Categories/],
    ['/admin/orders', /Orders/],
    ['/admin/orders/o1', /Order CV-2610-1001/],
    ['/admin/customers', /Customers/],
    ['/admin/reviews', /Reviews/],
    ['/admin/inbox', /Enquiries & support/],
    ['/admin/settings', /Website settings/],
  ])('%s renders for an admin', async (path, name) => {
    signIn(true);
    renderAt(path);
    expect(await heading(name)).toBeInTheDocument();
  });
});

describe('honest merchandising', () => {
  it('shows no discount without a genuine previous price, and blocks in-development products', async () => {
    renderAt('/products');
    const cards = await screen.findAllByRole('article');
    expect(screen.queryByText(/Save \d+%/)).not.toBeInTheDocument();
    const soonCard = cards.find((c) => within(c).queryByText('Website Starter Collection'))!;
    expect(within(soonCard).getByRole('button', { name: /In development/ })).toBeDisabled();
  });

  it('shows a discount only when the previous price is higher', async () => {
    api.searchProducts.mockResolvedValue({ total: 1, page: 1, page_size: 12, items: [{ ...published, original_price: 249 }] });
    renderAt('/products');
    expect(await screen.findByText('Save 20%')).toBeInTheDocument();
  });

  it('hides the bestsellers section when there are no paid orders', async () => {
    renderAt('/');
    await heading(/Digital Resources/);
    await waitFor(() => expect(api.fetchBestsellers).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Bestselling products' })).not.toBeInTheDocument();
  });

  it('never shows ratings without verified reviews', async () => {
    renderAt('/products/business-website-starter-kit');
    await heading(/Business Website Starter Kit/);
    expect(screen.queryByRole('img', { name: /out of 5 stars/ })).not.toBeInTheDocument();
    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
  });

  it('keeps sort and filters in the URL and passes them to the server search', async () => {
    renderAt('/products');
    await screen.findAllByRole('article');
    await userEvent.selectOptions(screen.getByLabelText('Sort products'), 'price_asc');
    await waitFor(() => expect(api.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'price_asc', page: 1 })));
  });
});

describe('cart and checkout', () => {
  it('adds to cart and shows totals calculated by the server', async () => {
    renderAt('/products/business-website-starter-kit');
    await heading(/Business Website Starter Kit/);
    await userEvent.click(screen.getAllByRole('button', { name: /Add Business Website Starter Kit to cart/ })[0]);
    expect(JSON.parse(localStorage.getItem('cv_cart_v1')!)).toEqual([P1]);
    cleanup();
    api.quoteOrder.mockResolvedValue({ ...quote(), subtotal: 199, total: 179, discount: 20, coupon: { code: 'LAUNCH', status: 'applied' } });
    renderAt('/cart');
    expect(await screen.findByText('Discount (LAUNCH)')).toBeInTheDocument();
    expect(screen.getByText('₹179')).toBeInTheDocument();
    expect(api.quoteOrder).toHaveBeenCalledWith([P1], '');
  });

  it('with payments disabled, offers a purchase enquiry and no pay button', async () => {
    localStorage.setItem('cv_cart_v1', JSON.stringify([P1]));
    signIn();
    renderAt('/checkout');
    expect(await screen.findByText(/Online checkout is currently unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send purchase enquiry' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pay .* securely/ })).not.toBeInTheDocument();
    expect(api.startCheckout).not.toHaveBeenCalled();
  });

  it('with payments enabled, requires terms consent before paying', async () => {
    api.fetchSettings.mockResolvedValue({ commerce: { checkout_mode: 'payments', payments_enabled: true, currencies: ['INR'], default_currency: 'INR', download_limit: 15 } });
    localStorage.setItem('cv_cart_v1', JSON.stringify([P1]));
    signIn();
    renderAt('/checkout');
    const pay = await screen.findByRole('button', { name: /Pay ₹199 securely/ });
    expect(pay).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms/ }));
    expect(pay).toBeEnabled();
  });

  it('in no-charge mode, completes the order without payment and says so honestly', async () => {
    api.fetchSettings.mockResolvedValue({ commerce: { checkout_mode: 'no_charge', payments_enabled: false, currencies: ['USD'], default_currency: 'USD', download_limit: 15 } });
    api.startCheckout.mockResolvedValue({ order_number: 'CV-2610-1002', completed: true });
    api.fetchOrderByNumber.mockResolvedValue({ ...order, order_number: 'CV-2610-1002', payment_provider: 'no_charge', payment_status: 'paid', total: 0, discount_amount: 199 });
    localStorage.setItem('cv_cart_v1', JSON.stringify([P1]));
    signIn();
    renderAt('/checkout');
    const button = await screen.findByRole('button', { name: 'Complete order' });
    expect(screen.getByText(/No payment is taken at the moment/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pay .* securely/ })).not.toBeInTheDocument();
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms/ }));
    await userEvent.click(button);
    expect(api.startCheckout).toHaveBeenCalledWith([P1], '');
    expect(await heading('Order complete')).toBeInTheDocument();
    expect(screen.getByText(/no payment was taken/)).toBeInTheDocument();
    expect(screen.queryByText(/Payment confirmed/)).not.toBeInTheDocument();
  });

  it('does not show success from redirect parameters while the server says pending', async () => {
    signIn();
    renderAt('/checkout/return?order=CV-2610-1001&razorpay_payment_link_status=paid');
    expect(await heading(/Confirming your payment/)).toBeInTheDocument();
    expect(screen.queryByText(/Payment confirmed/)).not.toBeInTheDocument();
  });

  it('shows success once the server marks the order paid', async () => {
    api.fetchOrderByNumber.mockResolvedValue({ ...order, payment_status: 'paid', paid_at: '2026-10-03T00:01:00Z' });
    signIn();
    renderAt('/checkout/return?order=CV-2610-1001');
    expect(await heading(/Payment confirmed/)).toBeInTheDocument();
  });

  it('shows failure for a failed payment', async () => {
    api.fetchOrderByNumber.mockResolvedValue({ ...order, payment_status: 'failed' });
    signIn();
    renderAt('/checkout/return?order=CV-2610-1001');
    expect(await heading(/Payment failed/)).toBeInTheDocument();
  });
});
