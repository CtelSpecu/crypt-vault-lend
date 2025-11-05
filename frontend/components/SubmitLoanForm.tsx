"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreateLoanValues } from "@/hooks/useLoanOperations";

const collateralOptions = ["ETH", "BTC", "USDC", "Mixed"] as const;

interface SubmitLoanFormProps {
  onSubmit: (values: CreateLoanValues) => Promise<void>;
  isSubmitting: boolean;
  disabledMessage?: string;
}

export function SubmitLoanForm({ onSubmit, isSubmitting, disabledMessage }: SubmitLoanFormProps) {
  const [amount, setAmount] = useState(50_000);
  const [interestRate, setInterestRate] = useState(7.5);
  const [duration, setDuration] = useState(12);
  const [collateralType, setCollateralType] = useState<typeof collateralOptions[number]>("ETH");
  const [collateralAmount, setCollateralAmount] = useState(100_000);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await onSubmit({
        amount,
        interestRate,
        duration,
        collateralType,
        collateralAmount,
      });
      toast.success("Encrypted loan submitted", {
        description: "Your request is pending funding on-chain.",
      });
    } catch (error) {
      console.error("Submit loan failed", error);
      toast.error("Submission failed", {
        description: (error as Error).message ?? "Unknown error",
      });
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-secondary uppercase tracking-widest">Submit Encrypted Loan</p>
          <h2 className="text-2xl font-bold text-foreground">Private borrowing powered by FHE</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">Requested Amount (USD)</span>
            <Input
              type="number"
              min={1}
              step={100}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">Interest Rate (APY %)</span>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={interestRate}
              onChange={(event) => setInterestRate(Number(event.target.value))}
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">Duration (months)</span>
            <Input
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">Collateral Amount (USD)</span>
            <Input
              type="number"
              min={0}
              step={100}
              value={collateralAmount}
              onChange={(event) => setCollateralAmount(Number(event.target.value))}
              required
            />
          </label>
        </div>

        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">Collateral Type</span>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={collateralType}
            onChange={(event) => setCollateralType(event.target.value as typeof collateralOptions[number])}
          >
            {collateralOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <Button
          type="submit"
          disabled={isSubmitting || Boolean(disabledMessage)}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? "Encrypting & Submitting..." : "Submit Loan Request"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {disabledMessage ||
            "Your numeric inputs are encrypted locally inside the browser before touching the blockchain."}
        </p>
      </form>
    </Card>
  );
}
