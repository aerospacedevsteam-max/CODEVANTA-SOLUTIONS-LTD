export type ProductStatus = 'draft' | 'coming_soon' | 'published' | 'archived';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
export type EntitlementStatus = 'active' | 'revoked' | 'expired';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type EnquiryStatus = 'new' | 'in_progress' | 'closed' | 'spam';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_path: string | null;
  is_published: boolean;
  display_order: number;
  archived_at: string | null;
}

export interface ProductSummary {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  short_description: string | null;
  product_type: string;
  price: number;
  currency: string;
  original_price: number | null;
  preview_images: string[];
  status: ProductStatus;
  is_featured: boolean;
  version: string;
  created_at: string;
  category_name?: string | null;
  category_slug?: string | null;
}

export interface ContentItem {
  name: string;
  description?: string;
}
export interface FaqItem {
  question: string;
  answer: string;
}

export interface Product extends ProductSummary {
  description: string | null;
  highlights: string[];
  contents: ContentItem[];
  technical_requirements: string[];
  compatibility: string[];
  faq: FaqItem[];
  licence_text: string | null;
  support_info: string | null;
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
}

export interface SearchResult {
  total: number;
  page: number;
  page_size: number;
  items: ProductSummary[];
}

export interface QuoteItem {
  product_id: string;
  title: string;
  slug: string;
  unit_price: number;
  currency: string;
  preview_image: string | null;
  product_type: string;
}

export interface Quote {
  items: QuoteItem[];
  unavailable: string[];
  currency: string | null;
  subtotal: number;
  discount: number;
  total: number;
  coupon: { code: string; status: 'applied' | 'invalid' | 'expired' | 'not_applicable' } | null;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_title_snapshot: string;
  unit_price: number;
  currency: string;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_email: string | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  currency: string;
  payment_provider: string | null;
  provider_order_id: string | null;
  payment_status: PaymentStatus;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface Entitlement {
  id: string;
  order_item_id: string;
  product_id: string;
  status: EntitlementStatus;
  download_count: number;
  download_limit: number;
  expires_at: string | null;
  revoked_reason: string | null;
  last_downloaded_at: string | null;
  created_at: string;
  product?: Pick<Product, 'id' | 'title' | 'slug' | 'version' | 'preview_images' | 'updated_at'> | null;
}

export interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  reviewer_name: string;
}

export interface SupportRequest {
  id: string;
  customer_id: string;
  order_id: string | null;
  subject: string;
  message: string;
  status: TicketStatus;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: 'customer' | 'admin';
  created_at: string;
}
