import { createContext, useContext } from 'react';

interface QuarterContextValue {
  currentQuarter: string;
  isFrozen: boolean;
  activeQuarter: string | null;
  setActiveQuarter: (quarter: string | null) => Promise<void>;
}

export const QuarterContext = createContext<QuarterContextValue | null>(null);

interface QuarterProviderProps {
  children: React.ReactNode;
  currentQuarter: string;
  isFrozen: boolean;
  activeQuarter: string | null;
  setActiveQuarter: (quarter: string | null) => Promise<void>;
}

/** Pure context pump — values are pre-resolved in Layout.tsx via useAppConfig. */
export function QuarterProvider({
  children,
  currentQuarter,
  isFrozen,
  activeQuarter,
  setActiveQuarter,
}: QuarterProviderProps) {
  return (
    <QuarterContext.Provider value={{ currentQuarter, isFrozen, activeQuarter, setActiveQuarter }}>
      {children}
    </QuarterContext.Provider>
  );
}

/** Returns the active quarter string (frozen override or calendar-based). */
export function useCurrentQuarter(): string {
  const ctx = useContext(QuarterContext);
  if (!ctx) throw new Error('useCurrentQuarter must be used within QuarterProvider');
  return ctx.currentQuarter;
}

/** Full quarter config access — for admin UI only. */
export function useQuarterConfig(): QuarterContextValue {
  const ctx = useContext(QuarterContext);
  if (!ctx) throw new Error('useQuarterConfig must be used within QuarterProvider');
  return ctx;
}
