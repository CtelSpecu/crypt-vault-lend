"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { getLendingPoolAddress, LENDING_POOL_ABI } from "@/contracts/lendingPool";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

export type PoolBalances = {
  balance?: ClearValueType;
  borrowed?: ClearValueType;
  totalLiquidity?: ClearValueType;
};

/**
 * Hook for managing encrypted lending pool operations with FHE
 */
export const useLendingPool = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  //////////////////////////////////////////////////////////////////////////////
  // States & Refs
  //////////////////////////////////////////////////////////////////////////////

  const [balanceHandle, setBalanceHandle] = useState<string | undefined>(undefined);
  const [borrowedHandle, setBorrowedHandle] = useState<string | undefined>(undefined);
  const [liquidityHandle, setLiquidityHandle] = useState<string | undefined>(undefined);
  
  const [clearBalance, setClearBalance] = useState<ClearValueType | undefined>(undefined);
  const [clearBorrowed, setClearBorrowed] = useState<ClearValueType | undefined>(undefined);
  const [clearLiquidity, setClearLiquidity] = useState<ClearValueType | undefined>(undefined);
  
  const clearBalanceRef = useRef<ClearValueType>(undefined);
  const clearBorrowedRef = useRef<ClearValueType>(undefined);
  const clearLiquidityRef = useRef<ClearValueType>(undefined);
  
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isProcessingRef = useRef<boolean>(isProcessing);
  
  const contractAddress = useMemo(() => {
    return chainId ? getLendingPoolAddress(chainId) : undefined;
  }, [chainId]);

  const isBalanceDecrypted = balanceHandle && balanceHandle === clearBalance?.handle;
  const isBorrowedDecrypted = borrowedHandle && borrowedHandle === clearBorrowed?.handle;
  const isLiquidityDecrypted = liquidityHandle && liquidityHandle === clearLiquidity?.handle;

  //////////////////////////////////////////////////////////////////////////////
  // Contract Instance
  //////////////////////////////////////////////////////////////////////////////

  const lendingPoolContract = useMemo(() => {
    if (!contractAddress || !ethersReadonlyProvider) {
      return undefined;
    }
    return new ethers.Contract(
      contractAddress,
      LENDING_POOL_ABI,
      ethersReadonlyProvider
    );
  }, [contractAddress, ethersReadonlyProvider]);

  //////////////////////////////////////////////////////////////////////////////
  // Refresh Handles (Get encrypted values from contract)
  //////////////////////////////////////////////////////////////////////////////

  const canRefresh = useMemo(() => {
    return contractAddress && ethersReadonlyProvider && !isRefreshing && ethersSigner;
  }, [contractAddress, ethersReadonlyProvider, isRefreshing, ethersSigner]);

  const refreshHandles = useCallback(() => {
    console.log("[useLendingPool] refreshHandles()");
    
    if (isRefreshingRef.current || !lendingPoolContract || !contractAddress) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = chainId;
    const thisContractAddress = contractAddress;

    lendingPoolContract.getPoolStats()
      .then((stats) => {
        console.log("[useLendingPool] stats fetched", stats);
        
        if (
          sameChain.current(thisChainId) &&
          thisContractAddress === contractAddress
        ) {
          // For MVP, pool stats are plain numbers
          setClearBalance({ handle: "pool", clear: BigInt(stats.totalValueLocked) });
          setClearBorrowed({ handle: "pool", clear: BigInt(stats.totalLoansActive) });
          setClearLiquidity({ handle: "pool", clear: BigInt(stats.averageAPY) });
        }

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e) => {
        console.error("[useLendingPool] refresh failed", e);
        setMessage("Failed to fetch balances: " + e.message);

        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [lendingPoolContract, contractAddress, chainId, sameChain]);

  // Auto refresh handles on mount and when dependencies change
  useEffect(() => {
    if (canRefresh) {
      refreshHandles();
    }
  }, [canRefresh, refreshHandles]);

  //////////////////////////////////////////////////////////////////////////////
  // Decrypt Handles
  //////////////////////////////////////////////////////////////////////////////

  const canDecrypt = useMemo(() => {
    return (
      contractAddress &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      (balanceHandle || borrowedHandle || liquidityHandle)
    );
  }, [
    contractAddress,
    instance,
    ethersSigner,
    isRefreshing,
    isDecrypting,
    balanceHandle,
    borrowedHandle,
    liquidityHandle,
  ]);

  const decryptHandles = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) {
      return;
    }

    if (!contractAddress || !instance || !ethersSigner) {
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = contractAddress;
    const thisEthersSigner = ethersSigner;
    
    const handlesToDecrypt: { handle: string; contractAddress: string }[] = [];
    
    if (balanceHandle && balanceHandle !== ethers.ZeroHash && balanceHandle !== clearBalanceRef.current?.handle) {
      handlesToDecrypt.push({ handle: balanceHandle, contractAddress });
    }
    if (borrowedHandle && borrowedHandle !== ethers.ZeroHash && borrowedHandle !== clearBorrowedRef.current?.handle) {
      handlesToDecrypt.push({ handle: borrowedHandle, contractAddress });
    }
    if (liquidityHandle && liquidityHandle !== ethers.ZeroHash && liquidityHandle !== clearLiquidityRef.current?.handle) {
      handlesToDecrypt.push({ handle: liquidityHandle, contractAddress });
    }

    if (handlesToDecrypt.length === 0) {
      return;
    }

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Decrypting values...");

    const run = async () => {
      const isStale = () =>
        thisContractAddress !== contractAddress ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [contractAddress as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Decryption cancelled (stale)");
          return;
        }

        setMessage("Calling FHEVM userDecrypt...");

        const res = await instance.userDecrypt(
          handlesToDecrypt,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (isStale()) {
          setMessage("Decryption result ignored (stale)");
          return;
        }

        // Update balance
        if (balanceHandle && res[balanceHandle] !== undefined) {
          const clearValue = { handle: balanceHandle, clear: res[balanceHandle] };
          setClearBalance(clearValue);
          clearBalanceRef.current = clearValue;
        }

        // Update borrowed
        if (borrowedHandle && res[borrowedHandle] !== undefined) {
          const clearValue = { handle: borrowedHandle, clear: res[borrowedHandle] };
          setClearBorrowed(clearValue);
          clearBorrowedRef.current = clearValue;
        }

        // Update liquidity
        if (liquidityHandle && res[liquidityHandle] !== undefined) {
          const clearValue = { handle: liquidityHandle, clear: res[liquidityHandle] };
          setClearLiquidity(clearValue);
          clearLiquidityRef.current = clearValue;
        }

        setMessage("Decryption completed!");
      } catch (error: unknown) {
        console.error("[useLendingPool] decrypt error", error);
        setMessage("Decryption failed: " + (error as Error).message);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    contractAddress,
    instance,
    balanceHandle,
    borrowedHandle,
    liquidityHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  //////////////////////////////////////////////////////////////////////////////
  // Encrypted Operations (Deposit, Borrow, Repay, Withdraw)
  //////////////////////////////////////////////////////////////////////////////

  const canOperate = useMemo(() => {
    return (
      contractAddress &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isProcessing
    );
  }, [contractAddress, instance, ethersSigner, isRefreshing, isProcessing]);

  const performOperation = useCallback(
    async (
      operation: "deposit" | "borrow" | "repay" | "withdraw",
      amount: number
    ): Promise<boolean> => {
      if (isRefreshingRef.current || isProcessingRef.current) {
        return false;
      }

      if (!contractAddress || !instance || !ethersSigner || amount <= 0) {
        return false;
      }

      const thisChainId = chainId;
      const thisContractAddress = contractAddress;
      const thisEthersSigner = ethersSigner;
      const lendingContract = new ethers.Contract(
        thisContractAddress,
        LENDING_POOL_ABI,
        thisEthersSigner
      );

      isProcessingRef.current = true;
      setIsProcessing(true);
      setMessage(`Processing ${operation}...`);

      try {
        // Let browser repaint before encrypting
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisContractAddress !== contractAddress ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        // Create encrypted input
        const input = instance.createEncryptedInput(
          thisContractAddress,
          thisEthersSigner.address
        );
        input.add64(amount);

        setMessage(`Encrypting ${operation} amount...`);
        const enc = await input.encrypt();

        if (isStale()) {
          setMessage(`${operation} cancelled (stale)`);
          return false;
        }

        setMessage(`Submitting ${operation} transaction...`);

        // Call appropriate contract function
        let tx: ethers.TransactionResponse;
        switch (operation) {
          case "deposit":
            tx = await lendingContract.deposit(enc.handles[0], enc.inputProof);
            break;
          case "borrow":
            tx = await lendingContract.borrow(enc.handles[0], enc.inputProof);
            break;
          case "repay":
            tx = await lendingContract.repay(enc.handles[0], enc.inputProof);
            break;
          case "withdraw":
            tx = await lendingContract.withdraw(enc.handles[0], enc.inputProof);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        setMessage(`Waiting for transaction: ${tx.hash}`);
        const receipt = await tx.wait();

        setMessage(`${operation} completed! Status: ${receipt?.status}`);

        if (isStale()) {
          return false;
        }

        // Refresh handles after successful operation
        setTimeout(() => refreshHandles(), 1000);

        return true;
      } catch (error: unknown) {
        console.error(`[useLendingPool] ${operation} error`, error);
        setMessage(`${operation} failed: ` + (error as Error).message);
        return false;
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [
      ethersSigner,
      contractAddress,
      instance,
      chainId,
      refreshHandles,
      sameChain,
      sameSigner,
    ]
  );

  // Individual operation functions
  const deposit = useCallback(
    (amount: number) => performOperation("deposit", amount),
    [performOperation]
  );

  const borrow = useCallback(
    (amount: number) => performOperation("borrow", amount),
    [performOperation]
  );

  const repay = useCallback(
    (amount: number) => performOperation("repay", amount),
    [performOperation]
  );

  const withdraw = useCallback(
    (amount: number) => performOperation("withdraw", amount),
    [performOperation]
  );

  return {
    contractAddress,
    canDecrypt,
    canRefresh,
    canOperate,
    deposit,
    borrow,
    repay,
    withdraw,
    decryptHandles,
    refreshHandles,
    isBalanceDecrypted,
    isBorrowedDecrypted,
    isLiquidityDecrypted,
    message,
    clearBalance: clearBalance?.clear,
    clearBorrowed: clearBorrowed?.clear,
    clearLiquidity: clearLiquidity?.clear,
    balanceHandle,
    borrowedHandle,
    liquidityHandle,
    isDecrypting,
    isRefreshing,
    isProcessing,
  };
};
