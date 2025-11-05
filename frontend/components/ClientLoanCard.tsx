"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useState, useEffect } from "react";
import { getLendingPoolAddress, LENDING_POOL_ABI } from "@/contracts/lendingPool";

interface LoanCardProps {
  id: string;
  amount: string;
  encryptedAmount: string;
  interestRate: string;
  duration: string;
  collateral: string;
  status: "available" | "active" | "completed";
}

// Internal component that uses wagmi hooks
const LoanCardWithWagmi = ({
  id,
  amount,
  encryptedAmount,
  interestRate,
  duration,
  collateral,
  status,
}: LoanCardProps) => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });
  
  const statusColors = {
    available: "bg-green-500/10 text-green-500",
    active: "bg-blue-500/10 text-blue-500",
    completed: "bg-gray-500/10 text-gray-500",
  };

  const handleDeposit = async () => {
    if (!isConnected) {
      toast.error("Wallet Not Connected", {
        description: "Please connect your wallet to deposit.",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      // TODO: Implement FHE encryption for deposit amount
      const mockEncryptedInput = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const mockProof = "0x";
      
      const contractAddress = getLendingPoolAddress(chainId);
      
      writeContract({
        address: contractAddress,
        abi: LENDING_POOL_ABI,
        functionName: 'deposit',
        args: [mockEncryptedInput, mockProof],
      });
      
      toast.success("Transaction Submitted", {
        description: `Depositing ${amount}. Please confirm in your wallet.`,
      });
    } catch (error) {
      toast.error("Transaction Failed", {
        description: "Failed to submit deposit transaction. Please try again.",
      });
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isConfirming) {
      setIsProcessing(true);
    } else if (hash && !isConfirming) {
      setIsProcessing(false);
      toast.success("Transaction Confirmed", {
        description: "Your deposit has been successfully processed.",
      });
    }
  }, [isConfirming, hash]);

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border bg-card">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <Badge className={statusColors[status]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          <Lock className="w-4 h-4 text-primary opacity-50" />
        </div>

        <div>
          <div className="text-2xl font-bold text-foreground">{amount}</div>
          <div className="text-xs text-muted-foreground mt-1 font-mono">
            {encryptedAmount}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">APY:</span>
            <span className="text-foreground font-medium">{interestRate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Term:</span>
            <span className="text-foreground font-medium">{duration}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">Collateral:</span>
          <span className="text-foreground font-medium">{collateral}</span>
        </div>

        <div className="flex gap-2">
          {status === "available" && (
            <>
              <Button 
                className="flex-1 glow-button" 
                size="sm"
                onClick={handleDeposit}
                disabled={isProcessing || !isConnected}
              >
                {isProcessing ? "Processing..." : "Deposit"}
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                View Details
              </Button>
            </>
          )}
          {status === "active" && (
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          )}
          {status === "completed" && (
            <Button variant="ghost" size="sm" className="w-full" disabled>
              Completed
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

// Wrapper component that handles SSR
export const ClientLoanCard = (props: LoanCardProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before wagmi is ready, show a simple card without wallet functionality
  if (!mounted) {
    return (
      <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border bg-card">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <Badge className={`${
                props.status === 'available' ? 'bg-green-500/10 text-green-500' :
                props.status === 'active' ? 'bg-blue-500/10 text-blue-500' :
                'bg-gray-500/10 text-gray-500'
              }`}>
                {props.status.charAt(0).toUpperCase() + props.status.slice(1)}
              </Badge>
            </div>
            <Lock className="w-4 h-4 text-primary opacity-50" />
          </div>

          <div>
            <div className="text-2xl font-bold text-foreground">{props.amount}</div>
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              {props.encryptedAmount}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">APY:</span>
              <span className="text-foreground font-medium">{props.interestRate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Term:</span>
              <span className="text-foreground font-medium">{props.duration}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="w-3 h-3 text-primary" />
            <span className="text-muted-foreground">Collateral:</span>
            <span className="text-foreground font-medium">{props.collateral}</span>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" size="sm" disabled>
              Loading...
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return <LoanCardWithWagmi {...props} />;
};
