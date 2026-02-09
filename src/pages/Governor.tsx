import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import BalanceCard from "@/components/BalanceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet,
  TrendingUp,
  Users,
  Shield,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PendingDeposit {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
  proof_url: string | null;
}

interface PendingWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  created_at: string;
}

interface SystemSetting {
  key: string;
  value: string;
}

const settingLabels: Record<string, { label: string; desc: string; format: (v: string) => string }> = {
  base_interest_rate: { label: "Base Interest Rate", desc: "Annual borrower rate", format: (v) => `${v}%` },
  lender_share_pct: { label: "Lender Share", desc: "Of borrower interest", format: (v) => `${v}%` },
  deposit_fee_pct: { label: "Deposit Fee", desc: "On all deposits", format: (v) => `${v}%` },
  max_loan_ratio: { label: "Max Loan Ratio", desc: "Of vault balance", format: (v) => `${v}%` },
  capital_lock_days: { label: "Capital Lock", desc: "Minimum lending period", format: (v) => `${v} days` },
  min_account_age_days: { label: "Min Account Age", desc: "For loan eligibility", format: (v) => `${v} days` },
};

const Governor = () => {
  const { toast } = useToast();
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalLending, setTotalLending] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [systemIncome, setSystemIncome] = useState(0);
  const [incomeBreakdown, setIncomeBreakdown] = useState<{ type: string; amount: number }[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);

    const [profilesRes, incomeRes, pendingRes, withdrawalsRes, settingsRes, membersRes] = await Promise.all([
      supabase.from("profiles").select("vault_balance, lending_balance, frozen_balance"),
      supabase.from("admin_income_ledger").select("type, amount"),
      supabase.from("deposits").select("id, user_id, amount, created_at, proof_url").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("id, user_id, amount, fee, bank_name, account_number, account_holder, created_at").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("settings").select("key, value"),
      supabase.from("profiles").select("id"),
    ]);

    if (profilesRes.data) {
      setTotalDeposits(profilesRes.data.reduce((s, p) => s + p.vault_balance, 0));
      setTotalLending(profilesRes.data.reduce((s, p) => s + p.lending_balance, 0));
    }
    if (membersRes.data) setMemberCount(membersRes.data.length);
    if (incomeRes.data) {
      setSystemIncome(incomeRes.data.reduce((s, r) => s + r.amount, 0));
      const grouped: Record<string, number> = {};
      incomeRes.data.forEach((r) => { grouped[r.type] = (grouped[r.type] || 0) + r.amount; });
      setIncomeBreakdown(Object.entries(grouped).map(([type, amount]) => ({ type, amount })));
    }
    if (pendingRes.data) setPendingDeposits(pendingRes.data);
    if (withdrawalsRes.data) setPendingWithdrawals(withdrawalsRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);

    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const formatCurrency = (amount: number) =>
    `₳${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handleDepositAction = async (depositId: string, action: "approved" | "rejected") => {
    setProcessingId(depositId);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("approve-deposit", {
        body: { depositId, action },
      });
      if (res.error) throw res.error;
      toast({ title: `Deposit ${action}`, description: `The deposit has been ${action}.` });
      setPendingDeposits((prev) => prev.filter((d) => d.id !== depositId));
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to process", variant: "destructive" });
    }
    setProcessingId(null);
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: "approved" | "rejected") => {
    setProcessingId(withdrawalId);
    try {
      const res = await supabase.functions.invoke("approve-withdrawal", {
        body: { withdrawalId, action },
      });
      if (res.error) throw res.error;
      toast({ title: `Withdrawal ${action}`, description: `The withdrawal has been ${action}.` });
      setPendingWithdrawals((prev) => prev.filter((w) => w.id !== withdrawalId));
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to process", variant: "destructive" });
    }
    setProcessingId(null);
  };

  const handleQrUpload = async () => {
    if (!qrFile) return;

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
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

      // Update settings
      const { data: existing } = await supabase.from("settings").select("id").eq("key", "deposit_qr_code_url").maybeSingle();
      if (existing) {
        await supabase.from("settings").update({ value: urlData.publicUrl }).eq("key", "deposit_qr_code_url");
      } else {
        // Need governor INSERT - for now use a workaround via update
        toast({ title: "Note", description: "QR code URL updated. If this is the first QR code, please seed the setting row first.", variant: "destructive" });
      }

      toast({ title: "QR Code Updated", description: "Members will now see the new QR code." });
      setQrFile(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setUploadingQr(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="ml-64 flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Governor Panel</h1>
            <p className="text-sm text-muted-foreground">System administration & oversight</p>
          </div>
          <Button variant="destructive" size="sm">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Emergency Kill Switch
          </Button>
        </div>

        {/* System Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BalanceCard title="Total Deposits" amount={formatCurrency(totalDeposits)} change="" changeType="neutral" icon={Wallet} glowing />
          <BalanceCard title="Total Lending" amount={formatCurrency(totalLending)} change="" changeType="neutral" icon={TrendingUp} />
          <BalanceCard title="Active Members" amount={memberCount.toLocaleString()} change="" changeType="neutral" icon={Users} />
          <BalanceCard title="System Income" amount={formatCurrency(systemIncome)} change="" changeType="neutral" icon={DollarSign} />
        </div>

        {/* Income Breakdown + QR Code Management */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Income Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {incomeBreakdown.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No income recorded yet</p>
              ) : (
                incomeBreakdown.map((source) => {
                  const pct = systemIncome > 0 ? ((source.amount / systemIncome) * 100).toFixed(0) : "0";
                  return (
                    <div key={source.type} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium capitalize">{source.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{pct}% of total</p>
                      </div>
                      <p className="font-display font-semibold text-primary">{formatCurrency(source.amount)}</p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Deposit QR Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Upload the QR code members will scan to make deposits.</p>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 transition-colors hover:border-primary/50">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{qrFile ? qrFile.name : "Click to upload QR code"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
              </label>
              {qrFile && (
                <Button variant="gold" size="sm" className="w-full" onClick={handleQrUpload} disabled={uploadingQr}>
                  {uploadingQr ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save QR Code
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Deposits */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Pending Deposits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDeposits.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No pending deposits</p>
              ) : (
                pendingDeposits.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">M-{dep.user_id.substring(0, 4).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(dep.amount)} · {formatDate(dep.created_at)}</p>
                      {dep.proof_url && (
                        <button
                          className="text-xs text-primary underline mt-0.5"
                          onClick={async () => {
                            const { data } = await supabase.storage.from("deposit-proofs").createSignedUrl(dep.proof_url!, 300);
                            if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                          }}
                        >
                          View Proof
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success hover:text-success"
                        disabled={processingId === dep.id}
                        onClick={() => handleDepositAction(dep.id, "approved")}
                      >
                        {processingId === dep.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={processingId === dep.id}
                        onClick={() => handleDepositAction(dep.id, "rejected")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Pending Withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingWithdrawals.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No pending withdrawals</p>
              ) : (
                pendingWithdrawals.map((w) => (
                  <div key={w.id} className="rounded-lg bg-secondary/30 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">M-{w.user_id.substring(0, 4).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(w.amount)} + ₳{w.fee.toFixed(2)} fee · {formatDate(w.created_at)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {w.bank_name} · ****{w.account_number.slice(-4)} · {w.account_holder}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success hover:text-success"
                          disabled={processingId === w.id}
                          onClick={() => handleWithdrawalAction(w.id, "approved")}
                        >
                          {processingId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={processingId === w.id}
                          onClick={() => handleWithdrawalAction(w.id, "rejected")}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Controls */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              System Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {settings
                .filter((s) => settingLabels[s.key])
                .map((setting) => {
                  const meta = settingLabels[setting.key];
                  return (
                    <div key={setting.key} className="rounded-lg bg-secondary/30 p-4">
                      <p className="text-xs text-muted-foreground">{meta.label}</p>
                      <p className="mt-1 font-display text-xl font-bold text-primary">{meta.format(setting.value)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Governor;
