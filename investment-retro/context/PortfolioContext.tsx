import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ApiError,
  getLatestPortfolio,
  PortfolioSnapshot,
} from '@/services/api';

type PortfolioContextValue = {
  latest: PortfolioSnapshot | null;
  loading: boolean;
  error: string | null;
  refreshLatest: () => Promise<PortfolioSnapshot | null>;
  setLatest: (portfolio: PortfolioSnapshot | null) => void;
};

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [latest, setLatest] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLatest = useCallback(async () => {
    if (!isAuthenticated) {
      setLatest(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const result = await getLatestPortfolio(token);
      setLatest(result.portfolio);
      return result.portfolio;
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setLatest(null);
        return null;
      }

      const message = caught instanceof Error ? caught.message : '無法讀取投資組合。';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshLatest();
    } else {
      setLatest(null);
      setError(null);
    }
  }, [isAuthenticated, refreshLatest]);

  const value = useMemo(
    () => ({ latest, loading, error, refreshLatest, setLatest }),
    [latest, loading, error, refreshLatest]
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);

  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }

  return context;
}
