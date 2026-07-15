import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAIProfile, patchAIProfile } from '@/services/api';
import type { AIProfileFieldKey } from '@/config/ai-profile-questions';

export type AIUserProfile = {
  analysisPriority:
    | 'stability'
    | 'growth'
    | 'income'
    | 'goal_completion'
    | 'unsure'
    | null;
  drawdownTolerance:
    | 'low'
    | 'medium_low'
    | 'medium'
    | 'high'
    | 'unsure'
    | null;
  investmentStyle:
    | 'dca'
    | 'buy_and_hold'
    | 'income'
    | 'active'
    | 'beginner'
    | null;
  goalTradeoff:
    | 'goal_first'
    | 'balanced'
    | 'growth_first'
    | 'unsure'
    | null;
  investmentHorizon:
    | 'within_1_year'
    | 'one_to_three_years'
    | 'three_to_five_years'
    | 'over_five_years'
    | 'unsure'
    | null;
  completedQuestionIds: string[];
  source: 'user_answered';
  updatedAt: string | null;
};

const DEFAULT_PROFILE: AIUserProfile = {
  analysisPriority: null,
  drawdownTolerance: null,
  investmentStyle: null,
  goalTradeoff: null,
  investmentHorizon: null,
  completedQuestionIds: [],
  source: 'user_answered',
  updatedAt: null,
};

type AIProfileContextType = {
  profile: AIUserProfile;
  loading: boolean;
  /** 本次 session 使用者是否按了「稍後再說」 */
  dismissed: boolean;
  /** 是否所有問題都已回答 */
  isComplete: boolean;
  /** 更新單一欄位 */
  updateField: (field: AIProfileFieldKey, value: string) => Promise<void>;
  /** 重設某一欄位（用於修改答案時清除） */
  resetField: (field: AIProfileFieldKey) => Promise<void>;
  /** 使用者按稍後再說 */
  dismiss: () => void;
  /** 重新載入 profile */
  refresh: () => Promise<void>;
};

const AIProfileContext = createContext<AIProfileContextType | undefined>(undefined);

export function AIProfileProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [profile, setProfile] = useState<AIUserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(DEFAULT_PROFILE);
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      const result = await getAIProfile(token);
      setProfile({ ...DEFAULT_PROFILE, ...result.profile } as AIUserProfile);
    } catch (err) {
      console.warn('[AIProfile] Failed to load profile:', err);
      // Keep default, don't block the app
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateField = useCallback(
    async (field: AIProfileFieldKey, value: string) => {
      const token = await getAccessToken();
      console.log('[AIProfile] Calling patchAIProfile:', field, value);
      const result = await patchAIProfile(token, { [field]: value });
      console.log('[AIProfile] patchAIProfile result:', JSON.stringify(result));
      setProfile({ ...DEFAULT_PROFILE, ...result.profile } as AIUserProfile);
    },
    [getAccessToken]
  );

  const resetField = useCallback(
    async (field: AIProfileFieldKey) => {
      const token = await getAccessToken();
      const result = await patchAIProfile(token, { [field]: null });
      setProfile({ ...DEFAULT_PROFILE, ...result.profile } as AIUserProfile);
    },
    [getAccessToken]
  );

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const refresh = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const isComplete = useMemo(() => {
    return profile.completedQuestionIds.length >= 4;
  }, [profile.completedQuestionIds]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      dismissed,
      isComplete,
      updateField,
      resetField,
      dismiss,
      refresh,
    }),
    [profile, loading, dismissed, isComplete, updateField, resetField, dismiss, refresh]
  );

  return (
    <AIProfileContext.Provider value={value}>
      {children}
    </AIProfileContext.Provider>
  );
}

export function useAIProfile() {
  const context = useContext(AIProfileContext);
  if (!context) {
    throw new Error('useAIProfile must be used within an AIProfileProvider');
  }
  return context;
}
