import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import BalanceCard from "@/components/BalanceCard";
import DepositModal from "@/components/DepositModal";
import WithdrawalModal from "@/components/WithdrawalModal";
import { Wallet, TrendingUp, Lock, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Deposit {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  status: string;
  created_at: string;
}

const Vault = () => {
  const { user } = useAuth();
  const [vaultBalance, setVaultBalance] = useState(0);
  const [lendingBalance, setLendingBalance] = useState(0);
  const [frozenBalance, setFrozenBalance] = useState(0);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    const [profileRes, depositsRes, withdrawalsRes] = await Promise.all([
      supabase.from("profiles").select("vault_balance, lending_balance, frozen_balance").eq("user_id", user.id).single(),
      supabase.from("deposits").select("id, amount, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("withdrawals").select("id, amount, fee, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    if (profileRes.data) {
      setVaultBalance(profileRes.data.vault_balance);
      setLendingBalance(profileRes.data.lending_balance);
      setFrozenBalance(profileRes.data.frozen_balance);
    }
    if (depositsRes.data) setDeposits(depositsRes.data);
    if (withdrawalsRes.data) setWithdrawals(withdrawalsRes.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const formatCurrency = (amount: number) =>
    `₳${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-primary/10 text-primary",
      approved: "bg-success/10 text-success",
      rejected: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
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

  const totalBalance = vaultBalance + lendingBalance + frozenBalance;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Vault</h1>
            <p className="text-sm text-muted-foreground">Manage your deposits and withdrawals</p>
          </div>
          <div className="flex gap-3">
            <Button variant="gold" onClick={() => setDepositOpen(true)}>
              <ArrowDownLeft className="mr-2 h-4 w-4" /> Deposit
            </Button>
            <Button variant="gold-outline" onClick={() => setWithdrawOpen(true)}>
              <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
            </Button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BalanceCard title="Total Balance" amount={formatCurrency(totalBalance)} icon={Wallet} glowing />
          <BalanceCard title="Vault Balance" amount={formatCurrency(vaultBalance)} icon={Wallet} />
          <BalanceCard title="Lending Balance" amount={formatCurrency(lendingBalance)} icon={TrendingUp} />
          <BalanceCard title="Frozen Collateral" amount={formatCurrency(frozenBalance)} icon={Lock} />
        </div>

        {/* Deposit & Withdrawal History */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Deposit History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deposits.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No deposits yet</p>
                ) : (
                  deposits.map((dep) => (
                    <div key={dep.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-success/10 p-2">
                          <ArrowDownLeft className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(dep.amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(dep.created_at)}</p>
                        </div>
                      </div>
                      {statusBadge(dep.status)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Withdrawal History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {withdrawals.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No withdrawals yet</p>
                ) : (
                  withdrawals.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-destructive/10 p-2">
                          <ArrowUpRight className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(w.amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(w.created_at)} · Fee: ₳{w.fee}</p>
                        </div>
                      </div>
                      {statusBadge(w.status)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DepositModal open={depositOpen} onOpenChange={setDepositOpen} onSuccess={fetchData} />
        <WithdrawalModal open={withdrawOpen} onOpenChange={setWithdrawOpen} vaultBalance={vaultBalance} onSuccess={fetchData} />
      </main>
    </div>
  );
};

export default Vault;
