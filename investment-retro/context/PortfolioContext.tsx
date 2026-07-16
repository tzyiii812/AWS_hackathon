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
import { APP_CURRENT_YEAR_MONTH } from '@/config/appDate';
import {
  getStoredValue,
  setStoredValue,
  deleteStoredValue,
} from '@/services/storage';

const CACHE_KEY = 'portfolio_latest';

type PortfolioContextValue = {
  latest: PortfolioSnapshot | null;
  loading: boolean;
  error: string | null;
  refreshLatest: () => Promise<PortfolioSnapshot | null>;
  setLatest: (portfolio: PortfolioSnapshot | null) => void;
};

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

async function loadCachedPortfolio(): Promise<PortfolioSnapshot | null> {
  try {
    const raw = await getStoredValue(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PortfolioSnapshot;
  } catch {
    return null;
  }
}

async function saveCachedPortfolio(portfolio: PortfolioSnapshot | null): Promise<void> {
  try {
    if (portfolio) {
      await setStoredValue(CACHE_KEY, JSON.stringify(portfolio));
    } else {
      await deleteStoredValue(CACHE_KEY);
    }
  } catch {
    // 快取寫入失敗不影響正常運作
  }
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [latest, setLatestState] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 包裝 setLatest，同時更新快取
  const setLatest = useCallback((portfolio: PortfolioSnapshot | null) => {
    setLatestState(portfolio);
    saveCachedPortfolio(portfolio);
  }, []);

  // 啟動時先載入本地快取
  useEffect(() => {
    loadCachedPortfolio().then((cached) => {
      if (cached) {
        setLatestState(cached);
      }
    });
  }, []);

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
      // 強制使用 App 模擬日期，避免後端用真實日期
      result.portfolio.yearMonth = APP_CURRENT_YEAR_MONTH;
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
  }, [isAuthenticated, getAccessToken, setLatest]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshLatest();
    } else {
      setLatest(null);
      setError(null);
    }
  }, [isAuthenticated, refreshLatest, setLatest]);

  const value = useMemo(
    () => ({ latest, loading, error, refreshLatest, setLatest }),
    [latest, loading, error, refreshLatest, setLatest]
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
