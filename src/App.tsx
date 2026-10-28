import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAdmin, RequireAuth, SiteLayout } from '@/components/layout/SiteLayout';
import { PageLoader } from '@/components/ui';
import Home from '@/pages/Home';
import Catalogue from '@/pages/Catalogue';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import { CheckoutCancelled, CheckoutReturn } from '@/pages/CheckoutResult';
import { AuthCallback, ForgotPassword, Register, ResetPassword, SignIn } from '@/pages/Auth';
import NotFound, { About, Contact, Faqs, SupportPage } from '@/pages/Info';
import { CookiePolicy, LicencePage, Privacy, RefundPolicy, Terms } from '@/pages/legal/Legal';

const account = () => import('@/pages/account/Account');
const AccountLayout = lazy(() => account().then((m) => ({ default: m.AccountLayout })));
const AccountOverview = lazy(() => account().then((m) => ({ default: m.AccountOverview })));
const AccountOrders = lazy(() => account().then((m) => ({ default: m.AccountOrders })));
const AccountOrderDetail = lazy(() => account().then((m) => ({ default: m.AccountOrderDetail })));
const AccountDownloads = lazy(() => account().then((m) => ({ default: m.AccountDownloads })));
const AccountSupport = lazy(() => account().then((m) => ({ default: m.AccountSupport })));

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const products = () => import('@/pages/admin/Products');
const AdminProducts = lazy(() => products().then((m) => ({ default: m.AdminProducts })));
const AdminProductEdit = lazy(() => products().then((m) => ({ default: m.AdminProductEdit })));
const manage = () => import('@/pages/admin/Manage');
const AdminCategories = lazy(() => manage().then((m) => ({ default: m.AdminCategories })));
const AdminOrders = lazy(() => manage().then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => manage().then((m) => ({ default: m.AdminOrderDetail })));
const AdminCustomers = lazy(() => manage().then((m) => ({ default: m.AdminCustomers })));
const AdminReviews = lazy(() => manage().then((m) => ({ default: m.AdminReviews })));
const AdminInbox = lazy(() => manage().then((m) => ({ default: m.AdminInbox })));
const AdminSettings = lazy(() => manage().then((m) => ({ default: m.AdminSettings })));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Catalogue mode="all" />} />
          <Route path="products/:slug" element={<ProductDetail />} />
          <Route path="categories/:slug" element={<Catalogue mode="category" />} />
          <Route path="search" element={<Catalogue mode="search" />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="checkout/return" element={<CheckoutReturn />} />
          <Route path="checkout/success" element={<CheckoutReturn />} />
          <Route path="checkout/cancelled" element={<CheckoutCancelled />} />

          <Route path="signin" element={<SignIn />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="auth/callback" element={<AuthCallback />} />

          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="faqs" element={<Faqs />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="refund-policy" element={<RefundPolicy />} />
          <Route path="licence" element={<LicencePage />} />
          <Route path="cookies" element={<CookiePolicy />} />

          <Route element={<RequireAuth />}>
            <Route path="account" element={<AccountLayout />}>
              <Route index element={<AccountOverview />} />
              <Route path="orders" element={<AccountOrders />} />
              <Route path="orders/:id" element={<AccountOrderDetail />} />
              <Route path="downloads" element={<AccountDownloads />} />
              <Route path="support" element={<AccountSupport />} />
            </Route>
          </Route>

          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/:id" element={<AdminProductEdit />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="inbox" element={<AdminInbox />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
