import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Loan {
  id: string;
  borrower_id: string;
  principal: number;
  interest_rate: number;
  duration_days: number;
  collateral_amount: number;
  status: string;
  created_at: string;
}

interface RepayLoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  vaultBalance: number;
  onSuccess: () => void;
}

const RepayLoanModal = ({ open, onOpenChange, loan, vaultBalance, onSuccess }: RepayLoanModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"confirm" | "done">("confirm");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setStep("confirm");
    onOpenChange(isOpen);
  };

  const { daysElapsed, interest, totalOwed } = useMemo(() => {
    if (!loan) return { daysElapsed: 0, interest: 0, totalOwed: 0 };
    const loanStart = new Date(loan.created_at).getTime();
    const now = Date.now();
    const days = Math.max(1, Math.ceil((now - loanStart) / 86400000));
    const int = loan.principal * (loan.interest_rate / 100) * (days / 365);
    return {
      daysElapsed: days,
      interest: Math.round(int * 100) / 100,
      totalOwed: Math.round((loan.principal + int) * 100) / 100,
    };
  }, [loan]);

  const canRepay = loan && vaultBalance >= totalOwed;

  const handleRepay = async () => {
    if (!loan || !canRepay) return;
    setIsSubmitting(true);

    try {
      const res = await supabase.functions.invoke("repay-loan", {
        body: { loanId: loan.id },
      });
      if (res.error) throw res.error;
      const data = res.data;
      if (data?.error) throw new Error(data.error);

      setStep("done");
      toast({ title: "Loan repaid!", description: `₳${totalOwed.toLocaleString()} repaid successfully. Collateral released.` });
      setTimeout(() => {
        onSuccess();
        handleOpen(false);
      }, 1500);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to repay loan", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `₳${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display gold-text">Repay Loan</DialogTitle>
        </DialogHeader>

        {step === "confirm" && loan && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Repay your loan in full. Interest is calculated for {daysElapsed} day{daysElapsed !== 1 ? "s" : ""} elapsed.
            </p>

            <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-semibold">{formatCurrency(loan.principal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest Rate</span>
                <span className="text-primary font-semibold">{loan.interest_rate}% p.a.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Elapsed</span>
                <span>{daysElapsed} of {loan.duration_days}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest Accrued</span>
                <span className="text-warning font-semibold">{formatCurrency(interest)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold">Total Owed</span>
                <span className="font-display text-lg font-bold text-primary">{formatCurrency(totalOwed)}</span>
              </div>
            </div>

            {loan.collateral_amount > 0 && (
              <div className="rounded-lg bg-success/10 border border-success/20 p-3 text-sm">
                <p className="text-success font-medium">Collateral will be released</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {formatCurrency(loan.collateral_amount)} will be unfrozen and returned to your vault.
                </p>
              </div>
            )}

            <div className="rounded-lg bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Your Vault Balance</p>
              <p className="font-display text-lg font-bold">
                {formatCurrency(vaultBalance)}
              </p>
              {!canRepay && (
                <div className="flex items-center gap-2 text-destructive text-xs mt-1">
                  <AlertCircle className="h-3 w-3" />
                  Insufficient balance. You need {formatCurrency(totalOwed - vaultBalance)} more.
                </div>
              )}
            </div>

            <Button variant="gold" className="w-full" onClick={handleRepay} disabled={!canRepay || isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : (
                `Repay ${formatCurrency(totalOwed)}`
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
            <p className="font-display font-semibold">Loan Repaid!</p>
            <p className="text-sm text-muted-foreground text-center">
              {formatCurrency(totalOwed)} has been deducted and your collateral has been released.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RepayLoanModal;
