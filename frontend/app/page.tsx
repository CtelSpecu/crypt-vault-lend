"use client";

import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock, Unlock, Eye } from "lucide-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SubmitLoanForm } from "@/components/SubmitLoanForm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useLoanData } from "@/hooks/useLoanData";
import { useLoanOperations } from "@/hooks/useLoanOperations";
import { useLoanDecryption } from "@/hooks/useLoanDecryption";
import { useEthersSigner } from "@/hooks/useEthersSigner";
import { getLendingPoolAddress } from "@/contracts/lendingPool";
import { LoanEntry } from "@/lib/lending";
import { useFhevm } from "@/fhevm/useFhevm";
import { GenericStringInMemoryStorage } from "@/fhevm/GenericStringStorage";

// Persistent storage for decryption signatures
const decryptionStorage = new GenericStringInMemoryStorage();

export default function Home() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [refreshKey, setRefreshKey] = useState(0);
  const contractAddress = useMemo(
    () => (chain?.id ? getLendingPoolAddress(chain.id) : undefined),
    [chain?.id]
  );

  const { instance, status: fheStatus, error: fheError } = useFhevm({
    provider: walletClient?.transport,
    chainId: chain?.id,
    enabled: Boolean(walletClient && chain?.id),
  });

  // Get ethers signer for decryption
  const ethersSigner = useEthersSigner();

  const { myLoans, isLoading } = useLoanData({
    contractAddress,
    publicClient,
    refreshKey,
    account: address,
  });

  const onSettled = () => setRefreshKey((prev) => prev + 1);

  const { createLoan, repayLoan, isCreating, isRepaying } = useLoanOperations({
    contractAddress,
    instance,
    account: address,
    publicClient,
    onSettled,
  });

  const {
    decryptLoan,
    getDecryptedLoan,
    isDecrypting,
    message: decryptMessage,
  } = useLoanDecryption({
    instance,
    contractAddress,
    ethersSigner,
    storage: decryptionStorage,
    chainId: chain?.id,
  });

  const submitDisabledMessage = useMemo(() => {
    if (!isConnected) {
      return "Connect your wallet to submit encrypted loans.";
    }
    if (!contractAddress) {
      return "Unsupported network. Switch to Sepolia or Localhost.";
    }
    if (fheStatus === "loading") {
      return "Initializing FHE runtime...";
    }
    if (fheStatus === "error") {
      return fheError?.message || "FHE runtime failed to start.";
    }
    return undefined;
  }, [isConnected, contractAddress, fheStatus, fheError]);

  const shortAddress = (value: string) =>
    `${value.slice(0, 6)}…${value.slice(-4)}`;

  const handleRepayLoan = async (loan: LoanEntry) => {
    try {
      const hash = await repayLoan(loan.id);
      toast.success("Loan repaid", { description: `Transaction sent: ${hash}` });
    } catch (error) {
      toast.error("Repayment failed", {
        description: (error as Error).message,
      });
    }
  };

  const handleDecryptLoan = async (loan: LoanEntry) => {
    try {
      await decryptLoan(
        loan.id,
        loan.amountHandle,
        loan.interestHandle,
        loan.collateralHandle
      );
      toast.success("Decryption completed", {
        description: "Your loan values are now visible.",
      });
    } catch (error) {
      toast.error("Decryption failed", {
        description: (error as Error).message,
      });
    }
  };

  const formatDecryptedValue = (value: bigint | undefined, suffix = "") => {
    if (value === undefined) return null;
    return `${Number(value).toLocaleString()}${suffix}`;
  };

  const LoanCard = ({ loan }: { loan: LoanEntry }) => {
    const decrypted = getDecryptedLoan(loan.id);
    const isDecrypted = decrypted?.amount !== undefined;

    return (
      <Card className="p-5 bg-card border-border hover:border-primary/30 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="font-mono text-sm text-muted-foreground">
            Loan #{loan.id.toString()}
          </div>
          <Badge
            className={
              loan.status === "available"
                ? "bg-secondary/20 text-secondary"
                : loan.status === "active"
                ? "bg-primary/20 text-primary"
                : "bg-muted/40 text-muted-foreground"
            }
          >
            {loan.status.toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-3">
          {/* Encrypted/Decrypted Values */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Amount (USD)</p>
              {isDecrypted ? (
                <p className="text-foreground font-medium flex items-center gap-1">
                  <Unlock className="h-3 w-3 text-secondary" />
                  ${formatDecryptedValue(decrypted.amount)}
                </p>
              ) : (
                <p className="font-mono text-xs text-primary flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {loan.amountHandle.slice(0, 10)}…
                </p>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Interest Rate</p>
              {isDecrypted ? (
                <p className="text-foreground font-medium flex items-center gap-1">
                  <Unlock className="h-3 w-3 text-secondary" />
                  {formatDecryptedValue(
                    decrypted.interestRate !== undefined
                      ? decrypted.interestRate / BigInt(100)
                      : undefined,
                    "%"
                  )}
                </p>
              ) : (
                <p className="font-mono text-xs text-primary flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {loan.interestHandle.slice(0, 10)}…
                </p>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Collateral</p>
              {isDecrypted && decrypted.collateralAmount !== undefined ? (
                <p className="text-foreground font-medium flex items-center gap-1">
                  <Unlock className="h-3 w-3 text-secondary" />
                  ${formatDecryptedValue(decrypted.collateralAmount)} {loan.collateralType}
                </p>
              ) : (
                <p className="text-foreground">
                  {loan.collateralType}
                  {loan.collateralHandle && (
                    <span className="font-mono text-xs text-primary ml-1">
                      <Lock className="h-3 w-3 inline" />
                    </span>
                  )}
                </p>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Duration</p>
              <p className="text-foreground">{loan.duration} months</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {!isDecrypted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDecryptLoan(loan)}
                disabled={isDecrypting || !instance || fheStatus !== "ready"}
                className="flex-1"
              >
                {isDecrypting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Decrypt Values
                  </>
                )}
              </Button>
            )}

            {loan.status === "active" && (
              <Button
                size="sm"
                onClick={() => handleRepayLoan(loan)}
                disabled={isRepaying}
                className="flex-1"
              >
                {isRepaying ? "Repaying..." : "Repay Loan"}
              </Button>
            )}

            {loan.status === "available" && (
              <div className="flex-1 text-xs text-muted-foreground text-center py-2">
                Waiting for lender funding…
              </div>
            )}

            {loan.status === "completed" && (
              <div className="flex-1 text-xs text-secondary text-center py-2">
                Loan completed
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-secondary uppercase tracking-[0.3em] mb-3">
            <ShieldCheck className="h-4 w-4" />
            FHE-ENCRYPTED LENDING
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Private Loan Requests
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Submit encrypted loan requests. Your amounts and rates stay private
            on-chain until you choose to decrypt them.
          </p>
        </div>

        {/* Submit Loan Form */}
        <div className="mb-8">
          <SubmitLoanForm
            onSubmit={async (values) => {
              await createLoan(values);
            }}
            isSubmitting={isCreating}
            disabledMessage={submitDisabledMessage}
          />
        </div>

        {/* My Loans Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">My Loans</h2>
              <p className="text-sm text-muted-foreground">
                Your encrypted loan requests
              </p>
            </div>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>

          {myLoans.length === 0 ? (
            <Card className="p-8 bg-card border-border text-center">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No loans yet. Submit an encrypted request above to get started.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myLoans.map((loan) => (
                <LoanCard key={loan.id.toString()} loan={loan} />
              ))}
            </div>
          )}

          {/* Decryption Status */}
          {decryptMessage && (
            <div className="mt-4 text-sm text-muted-foreground text-center">
              {decryptMessage}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
