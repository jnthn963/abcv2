import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Loan {
  id: string;
  borrower_id: string;
  principal: number;
  interest_rate: number;
  duration_days: number;
  collateral_amount: number;
}

interface FundLoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  vaultBalance: number;
  onSuccess: () => void;
}

const FundLoanModal = ({ open, onOpenChange, loan, vaultBalance, onSuccess }: FundLoanModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"confirm" | "done">("confirm");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setStep("confirm");
    onOpenChange(isOpen);
  };

  const canFund = loan && vaultBalance >= loan.principal;

  const handleFund = async () => {
    if (!loan || !canFund) return;
    setIsSubmitting(true);

    try {
      const res = await supabase.functions.invoke("fund-loan", {
        body: { loanId: loan.id },
      });
      if (res.error) throw res.error;
      const data = res.data;
      if (data?.error) throw new Error(data.error);

      setStep("done");
      toast({ title: "Loan funded!", description: `You funded ₳${loan.principal.toLocaleString()} successfully.` });
      setTimeout(() => {
        onSuccess();
        handleOpen(false);
      }, 1500);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to fund loan", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const anonymize = (id: string) => `M-${id.substring(0, 4).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display gold-text">Fund Loan</DialogTitle>
        </DialogHeader>

        {step === "confirm" && loan && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to fund a loan for <span className="font-medium text-foreground">{anonymize(loan.borrower_id)}</span>.
              The amount will be moved from your vault to your lending balance.
            </p>

            <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-semibold">₳{loan.principal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest Rate</span>
                <span className="text-primary font-semibold">{loan.interest_rate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{loan.duration_days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collateral</span>
                <span>₳{loan.collateral_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Your Vault Balance</p>
              <p className="font-display text-lg font-bold">₳{vaultBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              {!canFund && (
                <p className="text-xs text-destructive mt-1">Insufficient balance to fund this loan.</p>
              )}
            </div>

            <Button variant="gold" className="w-full" onClick={handleFund} disabled={!canFund || isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : (
                `Fund ₳${loan.principal.toLocaleString()}`
              )}
            </Button>
          </div>
        )}

        {step === "done" && loan && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-display font-semibold">Loan Funded!</p>
            <p className="text-sm text-muted-foreground text-center">
              ₳{loan.principal.toLocaleString()} has been transferred to the borrower.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FundLoanModal;
