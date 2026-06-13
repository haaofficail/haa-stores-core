import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storeApi, type StoreInfo } from '@/lib/api';

interface StoreContextValue {
  store: StoreInfo | null;
  loading: boolean;
  error: boolean;
}

const StoreContext = createContext<StoreContextValue>({ store: null, loading: true, error: false });

export function StoreProvider({ slug, children }: { slug?: string; children: ReactNode }) {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    storeApi.get(slug)
      .then(setStore)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <StoreContext.Provider value={{ store, loading, error }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
