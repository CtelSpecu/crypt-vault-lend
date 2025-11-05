"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLendingPool } from "@/hooks/useLendingPool";
import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { ethers } from "ethers";
import { RefObject } from "react";

interface UserDashboardProps {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}

export const UserDashboard = (props: UserDashboardProps) => {
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [borrowAmount, setBorrowAmount] = useState<string>("");
  const [repayAmount, setRepayAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [showDecrypted, setShowDecrypted] = useState<boolean>(false);

  const {
    contractAddress,
    canDecrypt,
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
    clearBalance,
    clearBorrowed,
    clearLiquidity,
    balanceHandle,
    borrowedHandle,
    liquidityHandle,
    isDecrypting,
    isRefreshing,
    isProcessing,
  } = useLendingPool(props);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid deposit amount" });
      return;
    }

    const success = await deposit(Math.floor(amount));
    
    if (success) {
      toast.success("Deposit Successful", { description: `Deposited ${amount} tokens. Transaction confirmed on-chain.` });
      setDepositAmount("");
    } else {
      toast.error("Deposit Failed", { description: "Transaction failed or was cancelled" });
    }
  };

  const handleBorrow = async () => {
    const amount = parseFloat(borrowAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid borrow amount" });
      return;
    }

    const success = await borrow(Math.floor(amount));
    
    if (success) {
      toast.success("Borrow Successful", { description: `Borrowed ${amount} tokens. Transaction confirmed on-chain.` });
      setBorrowAmount("");
    } else {
      toast.error("Borrow Failed", { description: "Transaction failed or was cancelled" });
    }
  };

  const handleRepay = async () => {
    const amount = parseFloat(repayAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid repay amount" });
      return;
    }

    const success = await repay(Math.floor(amount));
    
    if (success) {
      toast.success("Repayment Successful", { description: `Repaid ${amount} tokens. Transaction confirmed on-chain.` });
      setRepayAmount("");
    } else {
      toast.error("Repayment Failed", { description: "Transaction failed or was cancelled" });
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid withdraw amount" });
      return;
    }

    const success = await withdraw(Math.floor(amount));
    
    if (success) {
      toast.success("Withdrawal Successful", { description: `Withdrew ${amount} tokens. Transaction confirmed on-chain.` });
      setWithdrawAmount("");
    } else {
      toast.error("Withdrawal Failed", { description: "Transaction failed or was cancelled" });
    }
  };

  const handleDecrypt = () => {
    if (!canDecrypt) {
      toast.error("Cannot Decrypt", { description: "Missing required data or already decrypted" });
      return;
    }

    toast.info("Decrypting", { description: "Decrypting your encrypted balances..." });
    decryptHandles();
  };

  const handleToggleView = () => {
    if (!showDecrypted && !isBalanceDecrypted) {
      handleDecrypt();
    }
    setShowDecrypted(!showDecrypted);
  };

  const formatValue = (value: string | bigint | boolean | undefined, handle: string | undefined, isDecrypted: boolean | undefined) => {
    if (!handle || handle === ethers.ZeroHash) {
      return "0";
    }
    
    if (showDecrypted && isDecrypted && value !== undefined) {
      return value.toString();
    }
    
    return handle.slice(0, 10) + "..." + handle.slice(-8);
  };

  return (
    <div className="space-y-6">
      {/* Contract Info */}
      {contractAddress && (
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Contract Address</p>
              <p className="font-mono text-xs text-primary">{contractAddress}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshHandles}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Balance Display */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground">Your Balances</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleView}
            disabled={isDecrypting}
          >
            {isDecrypting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showDecrypted ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {/* Balance */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Deposited Balance</span>
            </div>
            <span className="font-mono text-foreground">
              {formatValue(clearBalance, balanceHandle, !!isBalanceDecrypted)}
            </span>
          </div>

          {/* Borrowed */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Borrowed Amount</span>
            </div>
            <span className="font-mono text-foreground">
              {formatValue(clearBorrowed, borrowedHandle, !!isBorrowedDecrypted)}
            </span>
          </div>

          {/* Total Liquidity */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-accent/5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent" />
              <span className="text-sm text-muted-foreground">Total Pool Liquidity</span>
            </div>
            <span className="font-mono text-foreground">
              {formatValue(clearLiquidity, liquidityHandle, !!isLiquidityDecrypted)}
            </span>
          </div>
        </div>

        {message && (
          <p className="mt-4 text-xs text-muted-foreground">{message}</p>
        )}
      </Card>

      {/* Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deposit */}
        <Card className="p-6 bg-card border-border">
          <h4 className="text-lg font-semibold text-foreground mb-4">Deposit</h4>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Amount to deposit"
              value={depositAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)}
              disabled={isProcessing}
            />
            <Button
              onClick={handleDeposit}
              disabled={!canOperate || isProcessing}
              className="w-full bg-secondary hover:bg-secondary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Deposit"
              )}
            </Button>
          </div>
        </Card>

        {/* Borrow */}
        <Card className="p-6 bg-card border-border">
          <h4 className="text-lg font-semibold text-foreground mb-4">Borrow</h4>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Amount to borrow"
              value={borrowAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBorrowAmount(e.target.value)}
              disabled={isProcessing}
            />
            <Button
              onClick={handleBorrow}
              disabled={!canOperate || isProcessing}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Borrow"
              )}
            </Button>
          </div>
        </Card>

        {/* Repay */}
        <Card className="p-6 bg-card border-border">
          <h4 className="text-lg font-semibold text-foreground mb-4">Repay</h4>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Amount to repay"
              value={repayAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepayAmount(e.target.value)}
              disabled={isProcessing}
            />
            <Button
              onClick={handleRepay}
              disabled={!canOperate || isProcessing}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Repay"
              )}
            </Button>
          </div>
        </Card>

        {/* Withdraw */}
        <Card className="p-6 bg-card border-border">
          <h4 className="text-lg font-semibold text-foreground mb-4">Withdraw</h4>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Amount to withdraw"
              value={withdrawAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)}
              disabled={isProcessing}
            />
            <Button
              onClick={handleWithdraw}
              disabled={!canOperate || isProcessing}
              className="w-full bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Withdraw"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
