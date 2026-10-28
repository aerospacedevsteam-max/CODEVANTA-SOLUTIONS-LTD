import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchCategories, fetchSettings } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { defaultSettings, mergeSettings, type SiteSettings } from '@/lib/settings';
import type { Category } from '@/lib/types';

interface SettingsState {
  settings: SiteSettings;
  categories: Category[];
  loaded: boolean;
  error: Error | null;
  reload: () => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    let active = true;
    Promise.all([fetchSettings(), fetchCategories()])
      .then(([s, c]) => {
        if (!active) return;
        setSettings(mergeSettings(s));
        setCategories(c);
        setError(null);
      })
      .catch((e) => active && setError(e))
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [tick]);

  return (
    <SettingsContext.Provider value={{ settings, categories, loaded, error, reload: () => setTick((t) => t + 1) }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
