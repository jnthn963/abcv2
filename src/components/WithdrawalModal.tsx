import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SuccessAnimation from "@/components/SuccessAnimation";

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultBalance: number;
  onSuccess: () => void;
}

const WITHDRAWAL_FEE = 15;

const WithdrawalModal = ({ open, onOpenChange, vaultBalance, onSuccess }: WithdrawalModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "done">("form");

  const parsedAmount = parseFloat(amount) || 0;
  const totalDeduction = parsedAmount + WITHDRAWAL_FEE;
  const canSubmit = parsedAmount > 0 && bankName && accountNumber && accountHolder && totalDeduction <= vaultBalance;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStep("form");
      setAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountHolder("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user.id,
        amount: parsedAmount,
        fee: WITHDRAWAL_FEE,
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        status: "pending",
      });
      if (error) throw error;

      setStep("done");
      toast({ title: "Withdrawal requested", description: "Your withdrawal is pending governor approval." });
      setTimeout(() => {
        onSuccess();
        handleOpen(false);
      }, 1500);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display gold-text">Withdraw Funds</DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="font-display text-lg font-bold">
                ₳{vaultBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Withdrawal Amount (₳)</Label>
              <Input
                type="number"
                min="1"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="transition-shadow focus:shadow-[0_0_0_2px_hsl(43,72%,52%,0.2)]"
              />
            </div>

            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input placeholder="e.g. GCash, BDO, BPI" value={bankName} onChange={(e) => setBankName(e.target.value)} className="transition-shadow focus:shadow-[0_0_0_2px_hsl(43,72%,52%,0.2)]" />
            </div>

            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="transition-shadow focus:shadow-[0_0_0_2px_hsl(43,72%,52%,0.2)]" />
            </div>

            <div className="space-y-2">
              <Label>Account Holder Name</Label>
              <Input placeholder="Full name on account" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="transition-shadow focus:shadow-[0_0_0_2px_hsl(43,72%,52%,0.2)]" />
            </div>

            {parsedAmount > 0 && (
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span>₳{parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span>₳{WITHDRAWAL_FEE.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-1 flex justify-between text-sm font-semibold">
                  <span>Total Deduction</span>
                  <span className={totalDeduction > vaultBalance ? "text-destructive" : ""}>
                    ₳{totalDeduction.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {totalDeduction > vaultBalance && parsedAmount > 0 && (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <AlertCircle className="h-3 w-3" />
                Insufficient balance for this withdrawal.
              </div>
            )}

            <Button
              variant="gold"
              className="w-full"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Request Withdrawal"
              )}
            </Button>
          </div>
        )}

        {step === "done" && (
          <SuccessAnimation
            title="Withdrawal Requested!"
            description={`₳${parsedAmount.toLocaleString()} will be sent after governor approval.`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalModal;
