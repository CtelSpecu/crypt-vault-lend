"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address, PublicClient } from "viem";
import type { LoanEntry } from "@/lib/lending";
import { fetchLoans, fetchPoolStats } from "@/lib/lending";

export interface PoolStatsPayload {
  totalValueLocked: number;
  totalLoansActive: number;
  averageAPY: number;
  utilizationRate: number;
}

interface UseLoanDataOptions {
  contractAddress?: Address;
  publicClient?: PublicClient;
  refreshKey?: number;
  account?: Address;
}

interface LoanDataState {
  stats?: PoolStatsPayload;
  loans: LoanEntry[];
  myLoans: LoanEntry[];
  availableLoans: LoanEntry[];
  isLoading: boolean;
  error?: Error;
}

export function useLoanData({
  contractAddress,
  publicClient,
  refreshKey = 0,
  account,
}: UseLoanDataOptions): LoanDataState {
  const [state, setState] = useState<LoanDataState>({
    loans: [],
    myLoans: [],
    availableLoans: [],
    isLoading: false,
  });

  useEffect(() => {
    if (!publicClient || !contractAddress) {
      setState((prev) => ({
        ...prev,
        stats: undefined,
        loans: [],
        myLoans: [],
        availableLoans: [],
        error: undefined,
        isLoading: false,
      }));
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

    (async () => {
      try {
        const [stats, loans] = await Promise.all([
          fetchPoolStats(publicClient, contractAddress),
          fetchLoans(publicClient, contractAddress),
        ]);

        if (cancelled) return;

        setState({
          stats,
          loans,
          myLoans: [],
          availableLoans: [],
          isLoading: false,
        });
      } catch (error) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error as Error,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, contractAddress, refreshKey]);

  const segmented = useMemo(() => {
    const accountLower = account?.toLowerCase();
    const myLoans = accountLower
      ? state.loans.filter((loan) => loan.borrower.toLowerCase() === accountLower)
      : [];
    const availableLoans = state.loans.filter(
      (loan) => loan.status === "available" && loan.borrower.toLowerCase() !== accountLower
    );
    return { myLoans, availableLoans };
  }, [state.loans, account]);

  return {
    stats: state.stats,
    loans: state.loans,
    myLoans: segmented.myLoans,
    availableLoans: segmented.availableLoans,
    isLoading: state.isLoading,
    error: state.error,
  };
}
