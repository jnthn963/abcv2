import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SuccessAnimation from "@/components/SuccessAnimation";

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

  const fetchQrCode = async () => {
    // Always fetch fresh from DB — no caching
    const { data } = await supabase.from("settings").select("value").eq("key", "deposit_qr_code_url").single();
    if (data?.value) {
      // Append fresh cache-bust to ensure browser doesn't serve stale image
      const url = data.value.includes("?") ? data.value.split("?")[0] : data.value;
      setQrCodeUrl(`${url}?t=${Date.now()}`);
    } else {
      setQrCodeUrl(null);
    }
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

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 999999999) {
      toast({ title: "Invalid Amount", description: "Enter a valid amount between 1 and 999,999,999", variant: "destructive" });
      return;
    }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Invalid File", description: "Only JPEG, PNG, and WebP images are allowed", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: "File Too Large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      if (!["jpg", "jpeg", "png", "webp"].includes(fileExt)) {
        throw new Error("Invalid file extension");
      }
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from("deposit-proofs").upload(filePath, file);
      if (uploadErr) throw uploadErr;

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
                className="transition-shadow focus:shadow-[0_0_0_2px_hsl(43,72%,52%,0.2)]"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Screenshot</Label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 transition-all hover:border-primary/50 hover:bg-primary/5">
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
          <SuccessAnimation
            title="Deposit Submitted!"
            description={`Your deposit of ₳${parseFloat(amount).toLocaleString()} is pending approval.`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
