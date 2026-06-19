"use client";

// =====================================================================
//  DataProvider — the single React context every page reads/writes
//  through. It hides the backend (Supabase vs localStorage) behind
//  getDb() and keeps an in-memory mirror of trades/withdrawals/settings
//  that is updated optimistically after each mutation.
//
//  SSR note: all backend access happens inside useEffect / event
//  handlers, never during render, so the server render is deterministic
//  (initializing=true, empty data) and `next build` works with no env.
// =====================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  Backend,
  Settings,
  Trade,
  TradeInput,
  Withdrawal,
  WithdrawalInput,
} from "@/lib/types";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settingsDefaults";
import { getDb } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";

// ---------------------------------------------------------------------
//  Context shape
// ---------------------------------------------------------------------
export interface DataContextValue {
  loading: boolean;
  initializing: boolean;
  error: string | null;
  backend: Backend;

  trades: Trade[];
  withdrawals: Withdrawal[];
  settings: Settings;

  refresh(): Promise<void>;

  addTrade(input: TradeInput): Promise<Trade>;
  updateTrade(id: string, patch: Partial<TradeInput>): Promise<Trade>;
  deleteTrade(id: string): Promise<void>;
  importTrades(inputs: TradeInput[]): Promise<void>;

  addWithdrawal(input: WithdrawalInput): Promise<Withdrawal>;
  deleteWithdrawal(id: string): Promise<void>;

  updateSettings(patch: Partial<Settings>): Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

// ---------------------------------------------------------------------
//  Sort helpers — keep the in-memory mirror in the same order the db
//  returns (date asc, then created_at asc).
// ---------------------------------------------------------------------
function sortByDate<T extends { date: string; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return 0;
  });
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong.";
}

// ---------------------------------------------------------------------
//  Provider
// ---------------------------------------------------------------------
export function DataProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<Backend>(
    isSupabaseConfigured ? "supabase" : "local",
  );

  const [trades, setTrades] = useState<Trade[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [settings, setSettings] = useState<Settings>(() => normalizeSettings(DEFAULT_SETTINGS));

  // Guards against state updates after unmount during the initial load.
  const mountedRef = useRef(true);

  // ---- initial load -------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const db = getDb();
        const [t, w, s] = await Promise.all([
          db.listTrades(),
          db.listWithdrawals(),
          db.getSettings(),
        ]);
        if (!mountedRef.current) return;
        setTrades(sortByDate(t));
        setWithdrawals(sortByDate(w));
        setSettings(s);
        setBackend(db.backend);
        setError(null);
      } catch (e) {
        if (!mountedRef.current) return;
        setError(errMessage(e));
      } finally {
        if (mountedRef.current) {
          setInitializing(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- mutation wrapper --------------------------------------------
  const mutate = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await fn();
      setError(null);
      return result;
    } catch (e) {
      setError(errMessage(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- refresh ------------------------------------------------------
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const db = getDb();
      const [t, w, s] = await Promise.all([
        db.listTrades(),
        db.listWithdrawals(),
        db.getSettings(),
      ]);
      setTrades(sortByDate(t));
      setWithdrawals(sortByDate(w));
      setSettings(s);
      setBackend(db.backend);
      setError(null);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- trade mutations ---------------------------------------------
  const addTrade = useCallback(
    (input: TradeInput): Promise<Trade> =>
      mutate(async () => {
        const trade = await getDb().createTrade(input);
        setTrades((prev) => sortByDate([...prev, trade]));
        return trade;
      }),
    [mutate],
  );

  const updateTrade = useCallback(
    (id: string, patch: Partial<TradeInput>): Promise<Trade> =>
      mutate(async () => {
        const trade = await getDb().updateTrade(id, patch);
        setTrades((prev) => sortByDate(prev.map((t) => (t.id === id ? trade : t))));
        return trade;
      }),
    [mutate],
  );

  const deleteTrade = useCallback(
    (id: string): Promise<void> =>
      mutate(async () => {
        await getDb().deleteTrade(id);
        setTrades((prev) => prev.filter((t) => t.id !== id));
      }),
    [mutate],
  );

  const importTrades = useCallback(
    (inputs: TradeInput[]): Promise<void> =>
      mutate(async () => {
        if (inputs.length === 0) return;
        const created = await getDb().bulkInsertTrades(inputs);
        setTrades((prev) => sortByDate([...prev, ...created]));
      }),
    [mutate],
  );

  // ---- withdrawal mutations ----------------------------------------
  const addWithdrawal = useCallback(
    (input: WithdrawalInput): Promise<Withdrawal> =>
      mutate(async () => {
        const withdrawal = await getDb().createWithdrawal(input);
        setWithdrawals((prev) => sortByDate([...prev, withdrawal]));
        return withdrawal;
      }),
    [mutate],
  );

  const deleteWithdrawal = useCallback(
    (id: string): Promise<void> =>
      mutate(async () => {
        await getDb().deleteWithdrawal(id);
        setWithdrawals((prev) => prev.filter((w) => w.id !== id));
      }),
    [mutate],
  );

  // ---- settings -----------------------------------------------------
  const updateSettings = useCallback(
    (patch: Partial<Settings>): Promise<void> =>
      mutate(async () => {
        const next = await getDb().saveSettings(patch);
        setSettings(next);
      }),
    [mutate],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      initializing,
      error,
      backend,
      trades,
      withdrawals,
      settings,
      refresh,
      addTrade,
      updateTrade,
      deleteTrade,
      importTrades,
      addWithdrawal,
      deleteWithdrawal,
      updateSettings,
    }),
    [
      loading,
      initializing,
      error,
      backend,
      trades,
      withdrawals,
      settings,
      refresh,
      addTrade,
      updateTrade,
      deleteTrade,
      importTrades,
      addWithdrawal,
      deleteWithdrawal,
      updateSettings,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// ---------------------------------------------------------------------
//  Hooks
// ---------------------------------------------------------------------
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (ctx === undefined) {
    throw new Error("useData must be used within a <DataProvider>.");
  }
  return ctx;
}

export function useSettings(): {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
} {
  const { settings, updateSettings } = useData();
  return { settings, updateSettings };
}
