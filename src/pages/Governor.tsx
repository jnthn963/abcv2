import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import TransactionLoader from "@/components/TransactionLoader";
import BalanceCard from "@/components/BalanceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Landmark,
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

interface Loan {
  id: string;
  borrower_id: string;
  lender_id: string | null;
  principal: number;
  interest_rate: number;
  duration_days: number;
  collateral_amount: number;
  status: string;
  created_at: string;
}

const settingLabels: Record<string, { label: string; desc: string; format: (v: string) => string }> = {
  base_interest_rate: { label: "Base Interest Rate", desc: "Annual borrower rate", format: (v) => `${v}%` },
  lender_share_pct: { label: "Lender Share", desc: "Of borrower interest", format: (v) => `${v}%` },
  deposit_fee_pct: { label: "Deposit Fee", desc: "On all deposits", format: (v) => `${v}%` },
  max_loan_ratio: { label: "Max Loan Ratio", desc: "Of vault balance", format: (v) => `${v}%` },
  capital_lock_days: { label: "Capital Lock", desc: "Minimum lending period", format: (v) => `${v} days` },
  min_account_age_days: { label: "Min Account Age", desc: "For loan eligibility", format: (v) => `${v} days` },
};

const statusColors: Record<string, string> = {
  pending: "bg-primary/10 text-primary",
  approved: "bg-success/10 text-success",
  completed: "bg-muted text-muted-foreground",
  defaulted: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
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
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [loanFilter, setLoanFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    loanId: string;
    action: "approved" | "rejected";
    principal: number;
  }>({ open: false, loanId: "", action: "approved", principal: 0 });

  const fetchData = async () => {
    setIsLoading(true);

    const [profilesRes, incomeRes, pendingRes, withdrawalsRes, settingsRes, membersRes, loansRes] = await Promise.all([
      supabase.from("profiles").select("vault_balance, lending_balance, frozen_balance"),
      supabase.from("admin_income_ledger").select("type, amount"),
      supabase.from("deposits").select("id, user_id, amount, created_at, proof_url").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("id, user_id, amount, fee, bank_name, account_number, account_holder, created_at").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("settings").select("key, value"),
      supabase.from("profiles").select("id"),
      supabase.from("loans").select("id, borrower_id, lender_id, principal, interest_rate, duration_days, collateral_amount, status, created_at").order("created_at", { ascending: false }),
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
    if (loansRes.data) setAllLoans(loansRes.data);

    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const formatCurrency = (amount: number) =>
    `₳${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const anonymize = (id: string) => `M-${id.substring(0, 4).toUpperCase()}`;

  const [slidingOutId, setSlidingOutId] = useState<string | null>(null);

  const handleDepositAction = async (depositId: string, action: "approved" | "rejected") => {
    setProcessingId(depositId);
    try {
      const res = await supabase.functions.invoke("approve-deposit", {
        body: { depositId, action },
      });
      if (res.error) throw res.error;
      toast({ title: `Deposit ${action}`, description: `The deposit has been ${action}.` });
      setSlidingOutId(depositId);
      setTimeout(() => {
        setPendingDeposits((prev) => prev.filter((d) => d.id !== depositId));
        setSlidingOutId(null);
        fetchData();
      }, 600);
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
      setSlidingOutId(withdrawalId);
      setTimeout(() => {
        setPendingWithdrawals((prev) => prev.filter((w) => w.id !== withdrawalId));
        setSlidingOutId(null);
        fetchData();
      }, 600);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to process", variant: "destructive" });
    }
    setProcessingId(null);
  };

  const handleLoanAction = async (loanId: string, action: "approved" | "rejected") => {
    setProcessingId(loanId);
    try {
      const res = await supabase.functions.invoke("manage-loan", {
        body: { loanId, action },
      });
      if (res.error) throw res.error;
      toast({ title: `Loan ${action}`, description: `The loan has been ${action}.` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to process", variant: "destructive" });
    }
    setProcessingId(null);
    setConfirmDialog({ open: false, loanId: "", action: "approved", principal: 0 });
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
      const cacheBustedUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update via edge function
      const res = await supabase.functions.invoke("governor-update-setting", {
        body: { settings: { deposit_qr_code_url: cacheBustedUrl } },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: "QR Code Updated", description: "Members will now see the new QR code." });
      setQrFile(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setUploadingQr(false);
  };

  const filteredLoans = loanFilter === "all" ? allLoans : allLoans.filter((l) => l.status === loanFilter);
  const pendingLoansCount = allLoans.filter((l) => l.status === "pending").length;
  const defaultedLoansCount = allLoans.filter((l) => l.status === "defaulted").length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Governor Panel</h1>
            <p className="text-sm text-muted-foreground">System administration & oversight</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full sm:w-auto"
            onClick={async () => {
              const frozen = settings.find(s => s.key === "system_frozen");
              const newValue = frozen?.value === "true" ? "false" : "true";
              try {
                const res = await supabase.functions.invoke("governor-update-setting", {
                  body: { settings: { system_frozen: newValue } },
                });
                if (res.error) throw res.error;
                if (res.data?.error) throw new Error(res.data.error);
                toast({
                  title: newValue === "true" ? "System Frozen" : "System Resumed",
                  description: newValue === "true" ? "All financial operations are now paused." : "Financial operations have been resumed.",
                  variant: newValue === "true" ? "destructive" : "default",
                });
                fetchData();
              } catch (e: any) {
                toast({ title: "Error", description: e.message, variant: "destructive" });
              }
            }}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {settings.find(s => s.key === "system_frozen")?.value === "true" ? "Resume System" : "Emergency Kill Switch"}
          </Button>
        </div>

        {/* System Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BalanceCard title="Total Deposits" amount={formatCurrency(totalDeposits)} change="" changeType="neutral" icon={Wallet} glowing />
          <BalanceCard title="Total Lending" amount={formatCurrency(totalLending)} change="" changeType="neutral" icon={TrendingUp} />
          <BalanceCard title="Active Members" amount={memberCount.toLocaleString()} change="" changeType="neutral" icon={Users} />
          <BalanceCard title="System Income" amount={formatCurrency(systemIncome)} change="" changeType="neutral" icon={DollarSign} />
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals
              {(pendingDeposits.length + pendingWithdrawals.length) > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {pendingDeposits.length + pendingWithdrawals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="loans">
              Loans
              {pendingLoansCount > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {pendingLoansCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-2">
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

            {/* Loan summary cards */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Card className="glass-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2"><Landmark className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-2xl font-bold font-display">{allLoans.length}</p>
                      <p className="text-xs text-muted-foreground">Total Loans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2"><AlertTriangle className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-2xl font-bold font-display">{pendingLoansCount}</p>
                      <p className="text-xs text-muted-foreground">Pending Approval</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-destructive/10 p-2"><XCircle className="h-5 w-5 text-destructive" /></div>
                    <div>
                      <p className="text-2xl font-bold font-display">{defaultedLoansCount}</p>
                      <p className="text-xs text-muted-foreground">Defaulted Loans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="glass-card border-border">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Pending Deposits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingDeposits.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">No pending deposits</p>
                  ) : (
                    <AnimatePresence>
                      {pendingDeposits.map((dep) => (
                        <motion.div
                          key={dep.id}
                          layout
                          initial={{ opacity: 1, x: 0 }}
                          animate={slidingOutId === dep.id
                            ? { opacity: 0, x: 300, transition: { duration: 0.5 } }
                            : { opacity: 1, x: 0 }
                          }
                          exit={{ opacity: 0, x: 300 }}
                          className="relative flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3"
                        >
                          {processingId === dep.id && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
                              <motion.span
                                className="font-display text-sm font-semibold"
                                style={{ color: "hsl(43, 96%, 56%)", textShadow: "0 0 12px hsla(43, 96%, 56%, 0.5)" }}
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              >
                                Atomic Update in Progress...
                              </motion.span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">{anonymize(dep.user_id)}</p>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success" disabled={processingId === dep.id} onClick={() => handleDepositAction(dep.id, "approved")}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={processingId === dep.id} onClick={() => handleDepositAction(dep.id, "rejected")}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
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
                    <AnimatePresence>
                      {pendingWithdrawals.map((w) => (
                        <motion.div
                          key={w.id}
                          layout
                          initial={{ opacity: 1, x: 0 }}
                          animate={slidingOutId === w.id
                            ? { opacity: 0, x: 300, transition: { duration: 0.5 } }
                            : { opacity: 1, x: 0 }
                          }
                          exit={{ opacity: 0, x: 300 }}
                          className="relative rounded-lg bg-secondary/30 px-4 py-3"
                        >
                          {processingId === w.id && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
                              <motion.span
                                className="font-display text-sm font-semibold"
                                style={{ color: "hsl(43, 96%, 56%)", textShadow: "0 0 12px hsla(43, 96%, 56%, 0.5)" }}
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              >
                                Atomic Update in Progress...
                              </motion.span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{anonymize(w.user_id)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(w.amount)} + ₳{w.fee.toFixed(2)} fee · {formatDate(w.created_at)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {w.bank_name} · ****{w.account_number.slice(-4)} · {w.account_holder}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success" disabled={processingId === w.id} onClick={() => handleWithdrawalAction(w.id, "approved")}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={processingId === w.id} onClick={() => handleWithdrawalAction(w.id, "rejected")}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Loans Tab */}
          <TabsContent value="loans">
            <Card className="glass-card border-border">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  Loan Management
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  {["all", "pending", "approved", "completed", "defaulted", "rejected"].map((f) => (
                    <Button
                      key={f}
                      variant={loanFilter === f ? "gold" : "ghost"}
                      size="sm"
                      onClick={() => setLoanFilter(f)}
                      className="capitalize text-xs"
                    >
                      {f}
                      {f === "pending" && pendingLoansCount > 0 && (
                        <span className="ml-1 text-xs">({pendingLoansCount})</span>
                      )}
                      {f === "defaulted" && defaultedLoansCount > 0 && (
                        <span className="ml-1 text-xs">({defaultedLoansCount})</span>
                      )}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {filteredLoans.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No loans found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-3 font-medium">Ref</th>
                          <th className="pb-3 font-medium">Borrower</th>
                          <th className="pb-3 font-medium">Lender</th>
                          <th className="pb-3 font-medium">Principal</th>
                          <th className="pb-3 font-medium">Interest</th>
                          <th className="pb-3 font-medium">Duration</th>
                          <th className="pb-3 font-medium">Collateral</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {filteredLoans.map((loan) => {
                          const isDefaulted = loan.status === "defaulted";
                          const daysElapsed = Math.max(1, Math.ceil((Date.now() - new Date(loan.created_at).getTime()) / 86400000));
                          const overdueDays = isDefaulted ? Math.max(0, daysElapsed - loan.duration_days) : 0;
                          const interestOwed = loan.principal * (loan.interest_rate / 100) * (daysElapsed / 365);

                          return (
                            <tr key={loan.id} className={`border-b border-border/50 transition-colors hover:bg-secondary/20 ${isDefaulted ? "bg-destructive/5" : ""}`}>
                              <td className="py-3 font-mono text-xs">{loan.id.substring(0, 8)}</td>
                              <td className="py-3 font-medium">{anonymize(loan.borrower_id)}</td>
                              <td className="py-3">{loan.lender_id ? anonymize(loan.lender_id) : "—"}</td>
                              <td className="py-3">{formatCurrency(loan.principal)}</td>
                              <td className="py-3 text-primary">{loan.interest_rate}%</td>
                              <td className="py-3">{loan.duration_days}d</td>
                              <td className="py-3">{formatCurrency(loan.collateral_amount)}</td>
                              <td className="py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[loan.status] || "bg-muted text-muted-foreground"}`}>
                                  {loan.status}
                                </span>
                              </td>
                              <td className="py-3 text-xs text-muted-foreground">{formatDate(loan.created_at)}</td>
                              <td className="py-3">
                                {loan.status === "pending" && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-success hover:text-success"
                                      disabled={processingId === loan.id}
                                      onClick={() => setConfirmDialog({ open: true, loanId: loan.id, action: "approved", principal: loan.principal })}
                                    >
                                      {processingId === loan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      disabled={processingId === loan.id}
                                      onClick={() => setConfirmDialog({ open: true, loanId: loan.id, action: "rejected", principal: loan.principal })}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                                {isDefaulted && (
                                  <span className="text-xs text-destructive font-medium">{overdueDays}d overdue</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Defaulted Loans Detail */}
            {allLoans.filter((l) => l.status === "defaulted").length > 0 && (
              <Card className="glass-card border-border mt-6 border-destructive/30">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Defaulted Loans Detail
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allLoans.filter((l) => l.status === "defaulted").map((loan) => {
                    const daysElapsed = Math.max(1, Math.ceil((Date.now() - new Date(loan.created_at).getTime()) / 86400000));
                    const interestOwed = loan.principal * (loan.interest_rate / 100) * (daysElapsed / 365);
                    const totalOwed = loan.principal + interestOwed;
                    const overdueDays = Math.max(0, daysElapsed - loan.duration_days);

                    return (
                      <div key={loan.id} className="rounded-lg bg-destructive/5 border border-destructive/20 px-4 py-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">Loan {loan.id.substring(0, 8)}</p>
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">{overdueDays}d overdue</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Borrower: {anonymize(loan.borrower_id)} · Lender: {loan.lender_id ? anonymize(loan.lender_id) : "—"}</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs">
                              <p>Principal: <span className="font-medium">{formatCurrency(loan.principal)}</span></p>
                              <p>Interest Owed: <span className="font-medium text-primary">{formatCurrency(Math.round(interestOwed * 100) / 100)}</span></p>
                              <p>Total Owed: <span className="font-medium text-destructive">{formatCurrency(Math.round(totalOwed * 100) / 100)}</span></p>
                              <p>Collateral: <span className="font-medium">{formatCurrency(loan.collateral_amount)}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
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
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.action === "approved" ? "Approve Loan" : "Reject Loan"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.action === "approved"
                  ? `Are you sure you want to approve this ${formatCurrency(confirmDialog.principal)} loan? It will be listed on the marketplace for lenders to fund.`
                  : `Are you sure you want to reject this ${formatCurrency(confirmDialog.principal)} loan? Any locked collateral will be released back to the borrower.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={confirmDialog.action === "rejected" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                onClick={() => handleLoanAction(confirmDialog.loanId, confirmDialog.action)}
              >
                {confirmDialog.action === "approved" ? "Approve" : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </DashboardLayout>
  );
};

export default Governor;
