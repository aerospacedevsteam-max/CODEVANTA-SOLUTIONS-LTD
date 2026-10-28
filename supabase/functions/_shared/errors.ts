// Maps database error codes (raised as 'CODE[: detail]') to safe HTTP responses.

export interface MappedError {
  status: number;
  code: string;
  message: string;
}

const KNOWN: Record<string, Omit<MappedError, 'code'>> = {
  AUTH_REQUIRED: { status: 401, message: 'Please sign in to continue.' },
  PRODUCT_UNAVAILABLE: { status: 409, message: 'One or more items are no longer available. Please review your cart.' },
  EMPTY_ORDER: { status: 400, message: 'Your cart is empty.' },
  TOO_MANY_ITEMS: { status: 400, message: 'Too many items in one order.' },
  MIXED_CURRENCIES: { status: 400, message: 'Items priced in different currencies must be purchased separately.' },
  COUPON_NOT_APPLICABLE: { status: 409, message: 'That coupon cannot be applied to this order.' },
  ZERO_TOTAL_NOT_SUPPORTED: { status: 400, message: 'Orders must have a total greater than zero.' },
  ALREADY_OWNED: { status: 409, message: 'You already own one of these products — find it in your downloads.' },
  NO_ENTITLEMENT: { status: 403, message: 'You do not have an active licence for this product.' },
  ENTITLEMENT_EXPIRED: { status: 403, message: 'Your download access for this product has expired. Contact support.' },
  DOWNLOAD_LIMIT_REACHED: { status: 429, message: 'Download limit reached for this product. Contact support for help.' },
  FILE_UNAVAILABLE: { status: 503, message: 'This file is temporarily unavailable. Please contact support.' },
  RATE_LIMITED: { status: 429, message: 'Too many requests. Please wait a few minutes and try again.' },
  PAYMENTS_DISABLED: {
    status: 503,
    message: 'Online payments are not enabled yet. Please use the purchase enquiry form instead.',
  },
  NO_CHARGE_DISABLED: { status: 503, message: 'Ordering is temporarily unavailable. Please try again later.' },
  PROVIDER_ERROR: { status: 502, message: 'The payment provider could not be reached. Please try again shortly.' },
};

export function mapError(err: unknown): MappedError {
  const raw = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  const code = raw.split(':')[0].trim();
  const known = KNOWN[code];
  if (known) return { code, ...known };
  return { status: 500, code: 'INTERNAL', message: 'Something went wrong. Please try again.' };
}
