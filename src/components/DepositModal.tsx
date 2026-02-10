import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, QrCode } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import SuccessAnimation from "@/components/SuccessAnimation";
import TransactionLoader from "@/components/TransactionLoader";

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
  const [step, setStep] = useState<"qr" | "upload" | "uploading" | "scanning" | "done">("qr");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchQrCode = async () => {
    const { data } = await supabase.from("settings").select("value").eq("key", "deposit_qr_code_url").single();
    if (data?.value) {
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
      setPreviewUrl(null);
      setUploadProgress(0);
      fetchQrCode();
    }
    onOpenChange(isOpen);
  };

  const handleFileChange = (f: File | null) => {
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Cleanup preview URL
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

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
      // Step 1: Uploading
      setStep("uploading");
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 8, 90));
      }, 150);

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      if (!["jpg", "jpeg", "png", "webp"].includes(fileExt)) {
        clearInterval(progressInterval);
        throw new Error("Invalid file extension");
      }
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from("deposit-proofs").upload(filePath, file);
      if (uploadErr) { clearInterval(progressInterval); throw uploadErr; }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Step 2: Scanning
      setStep("scanning");
      await new Promise((r) => setTimeout(r, 1800));

      // Step 3: Insert record
      const { error: insertErr } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: parsedAmount,
        proof_url: filePath,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      // Step 4: Done
      setStep("done");
      toast({ title: "Deposit submitted", description: "Your deposit is pending governor approval." });
      setTimeout(() => {
        onSuccess();
        handleOpen(false);
      }, 2200);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setStep("upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="glass-card border-border sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display gold-text">Deposit Funds</DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "qr" && (
            <motion.div
              key="qr"
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
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
            </motion.div>
          )}

          {step === "upload" && (
            <motion.div
              key="upload"
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
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
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <Button
                variant="gold"
                className="w-full"
                onClick={handleSubmit}
                disabled={!amount || !file || isUploading}
              >
                Submit Deposit
              </Button>
            </motion.div>
          )}

          {step === "uploading" && (
            <motion.div
              key="uploading"
              className="space-y-6 py-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col items-center gap-3">
                <motion.span
                  className="font-display text-3xl font-bold"
                  style={{
                    color: "hsl(43, 96%, 56%)",
                    textShadow: "0 0 16px hsla(43, 96%, 56%, 0.5)",
                  }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  ₳
                </motion.span>
                <p className="font-display text-sm font-semibold">Uploading Proof...</p>
                <div className="w-full max-w-xs">
                  <Progress value={uploadProgress} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
              </div>
            </motion.div>
          )}

          {step === "scanning" && (
            <motion.div
              key="scanning"
              className="relative flex flex-col items-center gap-4 py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="font-display text-sm font-semibold mb-2">Scanning Payment Proof...</p>
              <div className="relative h-40 w-40 overflow-hidden rounded-xl border border-border">
                {previewUrl && (
                  <img src={previewUrl} alt="Proof" className="h-full w-full object-cover" />
                )}
                {/* Laser scan line */}
                <motion.div
                  className="absolute left-0 right-0 h-0.5"
                  style={{
                    background: "linear-gradient(90deg, transparent, hsl(43, 96%, 56%), transparent)",
                    boxShadow: "0 0 12px hsla(43, 96%, 56%, 0.8)",
                  }}
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Verifying Ledger...</p>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <SuccessAnimation
                title="Deposit Logged!"
                description="A Governor will review your request shortly."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
