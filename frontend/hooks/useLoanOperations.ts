"use client";

import { useCallback, useMemo, useState } from "react";
import type { Address, Hash, PublicClient } from "viem";
import { bytesToHex } from "viem";
import { useWriteContract } from "wagmi";
import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { LENDING_POOL_ABI } from "@/contracts/lendingPool";

export interface CreateLoanValues {
  amount: number;
  interestRate: number; // percentage, e.g. 7.5
  duration: number; // months
  collateralType: string;
  collateralAmount: number;
}

interface UseLoanOperationsParams {
  contractAddress?: Address;
  instance?: FhevmInstance;
  account?: Address;
  publicClient?: PublicClient;
  onSettled?: () => void;
}

interface LoanOperationsState {
  createLoan: (values: CreateLoanValues) => Promise<Hash>;
  fundLoan: (loanId: bigint) => Promise<Hash>;
  repayLoan: (loanId: bigint) => Promise<Hash>;
  isCreating: boolean;
  isFunding: boolean;
  isRepaying: boolean;
}

export function useLoanOperations({
  contractAddress,
  instance,
  account,
  publicClient,
  onSettled,
}: UseLoanOperationsParams): LoanOperationsState {
  const { writeContractAsync } = useWriteContract();
  const [isCreating, setIsCreating] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);

  const supportsFhe = useMemo(
    () => Boolean(contractAddress && instance && account),
    [contractAddress, instance, account]
  );

  const waitReceipt = useCallback(
    async (hash: Hash) => {
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      onSettled?.();
      return hash;
    },
    [publicClient, onSettled]
  );

  const normalizeProof = useCallback((proof: Uint8Array | string) => {
    return typeof proof === "string" ? proof : bytesToHex(proof);
  }, []);

  const encryptValue = useCallback(
    async (value: number) => {
      if (!supportsFhe || !contractAddress || !instance || !account) {
        throw new Error("Encryption environment not ready");
      }

      const sanitized = Math.max(0, Math.floor(value));
      const input = instance.createEncryptedInput(contractAddress, account);
      input.add32(sanitized);
      const encrypted = await input.encrypt();
      return encrypted;
    },
    [supportsFhe, instance, contractAddress, account]
  );

  const createLoan = useCallback(
    async (values: CreateLoanValues) => {
      if (!contractAddress) {
        throw new Error("Unsupported network. Please switch to Hardhat or Sepolia.");
      }
      if (!supportsFhe) {
        throw new Error("Encryption system not ready. Connect wallet and wait for FHE init.");
      }

      if (
        values.amount <= 0 ||
        values.interestRate <= 0 ||
        values.duration <= 0 ||
        values.collateralAmount < 0 ||
        !values.collateralType.trim()
      ) {
        throw new Error("Invalid loan parameters. Please review the form.");
      }

      setIsCreating(true);
      try {
        const amountEnc = await encryptValue(values.amount);
        const rateEnc = await encryptValue(Math.round(values.interestRate * 100));
        const collateralEnc = await encryptValue(values.collateralAmount);

        const hash = await writeContractAsync({
          address: contractAddress,
          abi: LENDING_POOL_ABI,
          functionName: "createLoan",
          args: [
            amountEnc.handles[0],
            normalizeProof(amountEnc.inputProof),
            rateEnc.handles[0],
            normalizeProof(rateEnc.inputProof),
            values.duration,
            values.collateralType,
            collateralEnc.handles[0],
            normalizeProof(collateralEnc.inputProof),
          ],
        });

        return await waitReceipt(hash);
      } finally {
        setIsCreating(false);
      }
    },
    [contractAddress, supportsFhe, encryptValue, normalizeProof, writeContractAsync, waitReceipt]
  );

  const fundLoan = useCallback(
    async (loanId: bigint) => {
      if (!contractAddress) {
        throw new Error("Unsupported network. Please switch to Hardhat or Sepolia.");
      }
      setIsFunding(true);
      try {
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: LENDING_POOL_ABI,
          functionName: "fundLoan",
          args: [loanId],
        });
        return await waitReceipt(hash);
      } finally {
        setIsFunding(false);
      }
    },
    [contractAddress, writeContractAsync, waitReceipt]
  );

  const repayLoan = useCallback(
    async (loanId: bigint) => {
      if (!contractAddress) {
        throw new Error("Unsupported network. Please switch to Hardhat or Sepolia.");
      }
      setIsRepaying(true);
      try {
        const hash = await writeContractAsync({
          address: contractAddress,
          abi: LENDING_POOL_ABI,
          functionName: "repayLoan",
          args: [loanId],
        });
        return await waitReceipt(hash);
      } finally {
        setIsRepaying(false);
      }
    },
    [contractAddress, writeContractAsync, waitReceipt]
  );

  return {
    createLoan,
    fundLoan,
    repayLoan,
    isCreating,
    isFunding,
    isRepaying,
  };
}
