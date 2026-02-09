import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings, AlertTriangle, Upload, QrCode, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SettingItem {
  key: string;
  value: string;
}

const settingMeta: Record<string, { label: string; desc: string; type: "number" | "text" }> = {
  base_interest_rate: { label: "Base Interest Rate (%)", desc: "Annual borrower interest rate", type: "number" },
  lender_share_pct: { label: "Lender Share (%)", desc: "Percentage of borrower interest given to lender", type: "number" },
  deposit_fee_pct: { label: "Deposit Fee (%)", desc: "Fee deducted on all deposits", type: "number" },
  max_loan_ratio: { label: "Max Loan Ratio (%)", desc: "Maximum loan as percentage of vault balance", type: "number" },
  capital_lock_days: { label: "Capital Lock (days)", desc: "Minimum lending lock period", type: "number" },
  min_account_age_days: { label: "Min Account Age (days)", desc: "Minimum account age for loan eligibility", type: "number" },
  referral_l1_pct: { label: "Referral Level 1 (%)", desc: "Commission for direct referrals", type: "number" },
  referral_l2_pct: { label: "Referral Level 2 (%)", desc: "Commission for 2nd-level referrals", type: "number" },
  referral_l3_pct: { label: "Referral Level 3 (%)", desc: "Commission for 3rd-level referrals", type: "number" },
};

const GovernorSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [systemFrozen, setSystemFrozen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        setSettings(data);
        const frozen = data.find(s => s.key === "system_frozen");
        setSystemFrozen(frozen?.value === "true");
        const qr = data.find(s => s.key === "deposit_qr_code_url");
        if (qr?.value) setQrUrl(qr.value);
        const vals: Record<string, string> = {};
        data.forEach(s => { vals[s.key] = s.value; });
        setEditedValues(vals);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsPayload: Record<string, string> = {};
      Object.entries(editedValues)
        .filter(([key]) => key !== "system_frozen" && key !== "deposit_qr_code_url")
        .forEach(([key, value]) => { settingsPayload[key] = value; });

      const res = await supabase.functions.invoke("governor-update-setting", {
        body: { settings: settingsPayload },
      });
      if (res.error) throw res.error;
      const data = res.data;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Settings saved", description: "All system parameters have been updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleToggleFreeze = async () => {
    const newValue = !systemFrozen;
    try {
      const res = await supabase.functions.invoke("governor-update-setting", {
        body: { settings: { system_frozen: String(newValue) } },
      });
      if (res.error) throw res.error;
      const data = res.data;
      if (data?.error) throw new Error(data.error);

      setSystemFrozen(newValue);
      toast({
        title: newValue ? "System Frozen" : "System Resumed",
        description: newValue ? "All financial operations are now paused." : "Financial operations have been resumed.",
        variant: newValue ? "destructive" : "default",
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleQrUpload = async () => {
    if (!qrFile) return;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE = 5 * 1024 * 1024;
    if (!ALLOWED_TYPES.includes(qrFile.type)) {
      toast({ title: "Invalid File", description: "Only JPEG, PNG, and WebP images are allowed", variant: "destructive" });
      return;
    }
    if (qrFile.size > MAX_SIZE) {
      toast({ title: "File Too Large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }
    setUploadingQr(true);
    try {
      const ext = qrFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `current-qr.${ext}`;
      await supabase.storage.from("qr-codes").remove([filePath]);
      const { error: uploadErr } = await supabase.storage.from("qr-codes").upload(filePath, qrFile, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("qr-codes").getPublicUrl(filePath);
      
      // Add cache-busting parameter to force fresh fetch
      const cacheBustedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      // Update via edge function
      const res = await supabase.functions.invoke("governor-update-setting", {
        body: { settings: { deposit_qr_code_url: cacheBustedUrl } },
      });
      if (res.error) throw res.error;
      const data = res.data;
      if (data?.error) throw new Error(data.error);

      setQrUrl(cacheBustedUrl);
      toast({ title: "QR Code Updated", description: "Members will now see the new QR code." });
      setQrFile(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setUploadingQr(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const configKeys = Object.keys(settingMeta);

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">System Settings</h1>
          <p className="text-sm text-muted-foreground">Configure rates, fees, and system controls</p>
        </div>
        <Button variant="gold" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save All Settings
        </Button>
      </div>

      <Card className={`glass-card border-border mb-8 ${systemFrozen ? "border-destructive/50" : ""}`}>
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            <div className={`rounded-lg p-3 ${systemFrozen ? "bg-destructive/10" : "bg-success/10"}`}>
              <AlertTriangle className={`h-6 w-6 ${systemFrozen ? "text-destructive" : "text-success"}`} />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Emergency Kill Switch</h3>
              <p className="text-sm text-muted-foreground">
                {systemFrozen
                  ? "System is FROZEN — all financial operations are paused"
                  : "System is live — all operations are running normally"}
              </p>
            </div>
          </div>
          <Switch checked={systemFrozen} onCheckedChange={handleToggleFreeze} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> Rates & Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {configKeys.map((key) => {
              const meta = settingMeta[key];
              return (
                <div key={key} className="space-y-1">
                  <Label className="text-sm">{meta.label}</Label>
                  <Input
                    type={meta.type}
                    value={editedValues[key] || ""}
                    onChange={(e) => setEditedValues(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">{meta.desc}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Deposit QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload the QR code that members will scan to make deposit payments.
            </p>

            {qrUrl && (
              <div className="flex items-center justify-center rounded-xl bg-white p-4">
                <img src={qrUrl} alt="Current QR Code" className="h-40 w-40 object-contain" />
              </div>
            )}

            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 transition-colors hover:border-primary/50">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{qrFile ? qrFile.name : "Click to upload new QR code"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
            </label>

            {qrFile && (
              <Button variant="gold" className="w-full" onClick={handleQrUpload} disabled={uploadingQr}>
                {uploadingQr ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Upload QR Code
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GovernorSettings;
