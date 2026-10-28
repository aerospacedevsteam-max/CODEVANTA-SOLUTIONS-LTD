import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { addServerCartItems, clearServerCart, fetchServerCart, removeServerCartItem } from '@/lib/api';
import { clearGuestCart, MAX_CART_ITEMS, mergeCarts, readGuestCart, writeGuestCart } from '@/lib/cart';

interface CartState {
  ids: string[];
  count: number;
  has: (id: string) => boolean;
  add: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  couponCode: string;
  setCouponCode: (code: string) => void;
  syncError: string | null;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [ids, setIds] = useState<string[]>(() => readGuestCart());
  const [couponCode, setCouponCode] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncedFor = useRef<string | null>(null);

  // On sign-in: merge the guest cart into the customer's server cart, once.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (syncedFor.current) {
        // Signed out: start a fresh guest cart rather than exposing the account's cart.
        syncedFor.current = null;
        setIds(readGuestCart());
      }
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    (async () => {
      try {
        const server = await fetchServerCart(user.id);
        const { merged, toUpload } = mergeCarts(server, readGuestCart());
        await addServerCartItems(user.id, toUpload);
        clearGuestCart();
        setIds(merged);
        setSyncError(null);
      } catch (e) {
        setSyncError(e instanceof Error ? e.message : 'Could not sync your cart.');
      }
    })();
  }, [user, loading]);

  const add = useCallback(
    async (id: string) => {
      if (ids.includes(id) || ids.length >= MAX_CART_ITEMS) return;
      const next = [...ids, id];
      setIds(next);
      if (user) await addServerCartItems(user.id, [id]);
      else writeGuestCart(next);
    },
    [ids, user],
  );

  const remove = useCallback(
    async (id: string) => {
      const next = ids.filter((x) => x !== id);
      setIds(next);
      if (user) await removeServerCartItem(user.id, id);
      else writeGuestCart(next);
    },
    [ids, user],
  );

  const clear = useCallback(async () => {
    setIds([]);
    setCouponCode('');
    if (user) await clearServerCart(user.id);
    clearGuestCart();
  }, [user]);

  const value = useMemo<CartState>(
    () => ({ ids, count: ids.length, has: (id) => ids.includes(id), add, remove, clear, couponCode, setCouponCode, syncError }),
    [ids, add, remove, clear, couponCode, syncError],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
