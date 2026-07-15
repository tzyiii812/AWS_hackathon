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
  listGoals,
  createGoalApi,
  updateGoalApi,
  deleteGoalApi,
  type GoalData,
} from '@/services/api';

export type Goal = GoalData;

type GoalContextType = {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  addGoal: (goal: { icon: string; name: string; targetAmount: number; description?: string; imageKey?: string | null }) => Promise<void>;
  updateGoal: (id: string, updates: Partial<{ icon: string; name: string; targetAmount: number; description: string; completed: boolean; imageKey: string | null; achievementImageKey: string | null }>) => Promise<void>;
  completeGoal: (id: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
  activeGoals: Goal[];
  completedGoals: Goal[];
  totalTarget: number;
  goalCount: number;
  completedCount: number;
};

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!isAuthenticated) {
      setGoals([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const result = await listGoals(token);
      setGoals(result.goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入目標。');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const addGoal = useCallback(
    async (goal: { icon: string; name: string; targetAmount: number; description?: string; imageKey?: string | null }) => {
      const token = await getAccessToken();
      const result = await createGoalApi(token, goal);
      setGoals((prev) => [...prev, result.goal]);
    },
    [getAccessToken]
  );

  const updateGoal = useCallback(
    async (
      id: string,
      updates: Partial<{ icon: string; name: string; targetAmount: number; description: string; completed: boolean; imageKey: string | null; achievementImageKey: string | null }>
    ) => {
      const token = await getAccessToken();
      await updateGoalApi(token, id, updates);
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
      );
    },
    [getAccessToken]
  );

  const completeGoal = useCallback(
    async (id: string) => {
      await updateGoal(id, { completed: true });
    },
    [updateGoal]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      const token = await getAccessToken();
      await deleteGoalApi(token, id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    },
    [getAccessToken]
  );

  const refreshGoals = useCallback(async () => {
    await fetchGoals();
  }, [fetchGoals]);

  const activeGoals = useMemo(() => goals.filter((g) => !g.completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.completed), [goals]);
  const totalTarget = useMemo(
    () => activeGoals.reduce((sum, g) => sum + g.targetAmount, 0),
    [activeGoals]
  );
  const goalCount = goals.length;
  const completedCount = completedGoals.length;

  const value = useMemo(
    () => ({
      goals,
      loading,
      error,
      addGoal,
      updateGoal,
      completeGoal,
      deleteGoal,
      refreshGoals,
      activeGoals,
      completedGoals,
      totalTarget,
      goalCount,
      completedCount,
    }),
    [goals, loading, error, addGoal, updateGoal, completeGoal, deleteGoal, refreshGoals, activeGoals, completedGoals, totalTarget, goalCount, completedCount]
  );

  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoals() {
  const context = useContext(GoalContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalProvider');
  }
  return context;
}
