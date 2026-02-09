import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SuccessAnimation from "@/components/SuccessAnimation";

interface LoanRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultBalance: number;
  frozenBalance: number;
  onSuccess: () => void;
}

const LoanRequestModal = ({ open, onOpenChange, vaultBalance, frozenBalance, onSuccess }: LoanRequestModalProps) => {
  const { toast } = useToast();
  const [principal, setPrincipal] = useState("");
  const [collateral, setCollateral] = useState("");
  const [duration, setDuration] = useState("28");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "done">("form");

  const parsedPrincipal = parseFloat(principal) || 0;
  const parsedCollateral = parseFloat(collateral) || 0;
  const availableCollateral = vaultBalance - frozenBalance;
  const maxLoan = vaultBalance * 0.5;

  const errors: string[] = [];
  if (parsedPrincipal > maxLoan && parsedPrincipal > 0) errors.push(`Max loan is 50% of vault (₳${maxLoan.toFixed(2)})`);
  if (parsedCollateral > availableCollateral && parsedCollateral > 0) errors.push("Insufficient available balance for collateral");

  const canSubmit = parsedPrincipal > 0 && parsedCollateral >= 0 && parseInt(duration) >= 7 && errors.length === 0;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStep("form");
      setPrincipal("");
      setCollateral("");
      setDuration("28");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const res = await supabase.functions.invoke("request-loan", {
        body: {
          principal: parsedPrincipal,
          collateral_amount: parsedCollateral,
          duration_days: parseInt(duration),
        },
      });
      if (res.error) throw res.error;
      const data = res.data;
      if (data?.error) throw new Error(data.error);

      setStep("done");
      toast({ title: "Loan requested", description: "Your loan is now listed in the marketplace." });
      setTimeout(() => {
        onSuccess();
        handleOpen(false);
      }, 1500);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to request loan", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display gold-text">Request a Loan</DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Vault Balance</p>
                <p className="font-display text-sm font-bold">₳{vaultBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Available for Collateral</p>
                <p className="font-display text-sm font-bold">₳{availableCollateral.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Loan Amount (₳)</Label>
              <Input type="number" min="1" placeholder="Enter principal amount" value={principal} onChange={(e) => setPrincipal(e.target.value)} className="transition-shadow focus:shadow-[0_0_0_2px_hsl(43,72%,52%,0.2)]" />
              <p className="text-xs text-muted-foreground">Max: ₳{maxLoan.toFixed(2)} (50% of vault)</p>
            </div>

            <div className="space-y-2">
              <Label>Collateral Amount (₳)</Label>
              <Input type="number" min="0" placeholder="Enter collateral" value={collateral} onChange={(e) => setCollateral(e.target.value)} className="transition-shadow focus:shadow-[0_0_0_2px_hsl(43,72%,52%,0.2)]" />
              <p className="text-xs text-muted-foreground">Locked until loan is repaid or completed</p>
            </div>

            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input type="number" min="7" max="365" placeholder="28" value={duration} onChange={(e) => setDuration(e.target.value)} className="transition-shadow focus:shadow-[0_0_0_2px_hsl(43,72%,52%,0.2)]" />
            </div>

            {errors.length > 0 && (
              <div className="space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 text-destructive text-xs">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal</span>
                <span>₳{parsedPrincipal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collateral (locked)</span>
                <span>₳{parsedCollateral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span>{duration} days</span>
              </div>
            </div>

            <Button variant="gold" className="w-full" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
              ) : (
                "Submit Loan Request"
              )}
            </Button>
          </div>
        )}

        {step === "done" && (
          <SuccessAnimation
            title="Loan Request Submitted!"
            description={`Your loan of ₳${parsedPrincipal.toLocaleString()} is now listed in the marketplace.`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoanRequestModal;
