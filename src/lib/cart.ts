// Guest cart helpers. The browser copy only remembers WHICH products a visitor
// picked; prices, availability and totals always come from the server.

export const GUEST_CART_KEY = 'cv_cart_v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_CART_ITEMS = 50;

export function sanitizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === 'string' && UUID.test(v)))].slice(0, MAX_CART_ITEMS);
}

export function readGuestCart(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): string[] {
  try {
    return sanitizeIds(JSON.parse(storage?.getItem(GUEST_CART_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function writeGuestCart(ids: string[], storage: Pick<Storage, 'setItem'> | undefined = safeStorage()) {
  try {
    storage?.setItem(GUEST_CART_KEY, JSON.stringify(sanitizeIds(ids)));
  } catch {
    /* storage unavailable (private mode, quota) — cart stays in memory */
  }
}

export function clearGuestCart(storage: Pick<Storage, 'removeItem'> | undefined = safeStorage()) {
  try {
    storage?.removeItem(GUEST_CART_KEY);
  } catch {
    /* ignore */
  }
}

/** Union of server and guest carts, server order first, without duplicates. */
export function mergeCarts(server: string[], guest: string[]): { merged: string[]; toUpload: string[] } {
  const s = sanitizeIds(server);
  const toUpload = sanitizeIds(guest).filter((id) => !s.includes(id));
  return { merged: sanitizeIds([...s, ...toUpload]), toUpload };
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
