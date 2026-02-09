import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DepositModal = ({ open, onOpenChange, onSuccess }: DepositModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [step, setStep] = useState<"qr" | "upload" | "done">("qr");

  // Fetch QR code on open
  const fetchQrCode = async () => {
    const { data } = await supabase.from("settings").select("value").eq("key", "deposit_qr_code_url").single();
    if (data) setQrCodeUrl(data.value);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStep("qr");
      setAmount("");
      setFile(null);
      fetchQrCode();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!user || !amount || !file) return;
    setIsUploading(true);

    try {
      // Upload proof to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from("deposit-proofs").upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("deposit-proofs").getPublicUrl(filePath);

      // Create deposit record
      const { error: insertErr } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: parseFloat(amount),
        proof_url: filePath,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      setStep("done");
      toast({ title: "Deposit submitted", description: "Your deposit is pending governor approval." });
      setTimeout(() => {
        onSuccess();
        handleOpen(false);
      }, 1500);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="glass-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display gold-text">Deposit Funds</DialogTitle>
        </DialogHeader>

        {step === "qr" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan the QR code below to make your payment, then upload a screenshot as proof.
            </p>
            <div className="flex items-center justify-center rounded-xl bg-white p-4">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Payment QR Code" className="h-56 w-56 object-contain" />
              ) : (
                <div className="flex h-56 w-56 flex-col items-center justify-center text-muted-foreground">
                  <QrCode className="h-16 w-16 mb-2 text-border" />
                  <p className="text-xs text-center">No QR code set. Contact your governor.</p>
                </div>
              )}
            </div>
            <Button variant="gold" className="w-full" onClick={() => setStep("upload")}>
              I've Made the Payment
            </Button>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₳)</Label>
              <Input
                type="number"
                min="1"
                placeholder="Enter deposit amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Screenshot</Label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 transition-colors hover:border-primary/50">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : "Click to upload screenshot"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <Button
              variant="gold"
              className="w-full"
              onClick={handleSubmit}
              disabled={!amount || !file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Deposit"
              )}
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-display font-semibold">Deposit Submitted!</p>
            <p className="text-sm text-muted-foreground text-center">
              Your deposit of ₳{parseFloat(amount).toLocaleString()} is pending approval.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
