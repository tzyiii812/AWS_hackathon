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
  getPortfolioHistory,
  PortfolioSnapshot,
} from '@/services/api';

type PortfolioHistoryContextValue = {
  portfolios: PortfolioSnapshot[];
  loading: boolean;
  error: string | null;
  count: number;
  refresh: () => Promise<void>;
};

const PortfolioHistoryContext = createContext<PortfolioHistoryContextValue | undefined>(
  undefined
);

export function PortfolioHistoryProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [portfolios, setPortfolios] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setPortfolios([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const result = await getPortfolioHistory(token, 24);
      setPortfolios(result.portfolios);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setPortfolios([]);
        return;
      }

      const message =
        caught instanceof Error ? caught.message : '無法讀取投資組合歷史。';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setPortfolios([]);
      setError(null);
    }
  }, [isAuthenticated, refresh]);

  const value = useMemo(
    () => ({
      portfolios,
      loading,
      error,
      count: portfolios.length,
      refresh,
    }),
    [portfolios, loading, error, refresh]
  );

  return (
    <PortfolioHistoryContext.Provider value={value}>
      {children}
    </PortfolioHistoryContext.Provider>
  );
}

export function usePortfolioHistory() {
  const context = useContext(PortfolioHistoryContext);

  if (!context) {
    throw new Error('usePortfolioHistory must be used within a PortfolioHistoryProvider');
  }

  return context;
}
