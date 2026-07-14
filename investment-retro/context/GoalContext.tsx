import React, { createContext, useContext, useState, useCallback } from 'react';

export type Goal = {
  id: string;
  icon: string;
  name: string;
  targetAmount: number;
  description?: string;
  completed: boolean;
  createdAt: string;
};

type GoalContextType = {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'completed' | 'createdAt'>) => void;
  completeGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  activeGoals: Goal[];
  completedGoals: Goal[];
  totalTarget: number;
  goalCount: number;
  completedCount: number;
};

const GoalContext = createContext<GoalContextType | undefined>(undefined);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      icon: '✈️',
      name: '東京旅行',
      targetAmount: 200000,
      description: '和朋友一起去東京玩兩週',
      completed: false,
      createdAt: '2025-12-01',
    },
    {
      id: '2',
      icon: '💻',
      name: 'MacBook Pro',
      targetAmount: 65000,
      description: '',
      completed: false,
      createdAt: '2026-01-15',
    },
    {
      id: '3',
      icon: '🏠',
      name: '買房頭期款',
      targetAmount: 2000000,
      description: '在台北買一間小公寓',
      completed: false,
      createdAt: '2026-03-01',
    },
  ]);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'completed' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goal,
      id: Date.now().toString(),
      completed: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setGoals((prev) => [...prev, newGoal]);
  }, []);

  const completeGoal = useCallback((id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: true } : g))
    );
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const goalCount = goals.length;
  const completedCount = completedGoals.length;

  return (
    <GoalContext.Provider
      value={{
        goals,
        addGoal,
        completeGoal,
        deleteGoal,
        activeGoals,
        completedGoals,
        totalTarget,
        goalCount,
        completedCount,
      }}
    >
      {children}
    </GoalContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalContext);
  if (!context) {
    throw new Error('useGoals must be used within a GoalProvider');
  }
  return context;
}
