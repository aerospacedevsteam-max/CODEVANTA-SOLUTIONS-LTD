import { supabase } from './supabase';

/**
 * Preview images are either static files bundled with the site (start with "/")
 * or objects in the public `product-media` bucket (stored as object names).
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '/previews/placeholder.svg';
  if (path.startsWith('/') || /^https?:\/\//.test(path)) return path;
  if (!supabase) return '/previews/placeholder.svg';
  return supabase.storage.from('product-media').getPublicUrl(path).data.publicUrl;
}
