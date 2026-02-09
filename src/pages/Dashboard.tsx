import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import BalanceCard from "@/components/BalanceCard";
import DepositModal from "@/components/DepositModal";
import WithdrawalModal from "@/components/WithdrawalModal";
import { Wallet, TrendingUp, Lock, Users, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  vault_balance: number;
  lending_balance: number;
  frozen_balance: number;
}

interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface Loan {
  id: string;
  borrower_id: string;
  principal: number;
  interest_rate: number;
  duration_days: number;
  collateral_amount: number;
  status: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    const [profileRes, ledgerRes, loansRes, referralsRes, referralEarningsRes] = await Promise.all([
      supabase.from("profiles").select("vault_balance, lending_balance, frozen_balance").eq("user_id", user.id).single(),
      supabase.from("ledger").select("id, type, amount, description, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("loans").select("id, borrower_id, principal, interest_rate, duration_days, collateral_amount, status").in("status", ["approved", "pending"]).order("created_at", { ascending: false }).limit(10),
      supabase.from("referrals").select("id").eq("user_id", user.id),
      supabase.from("ledger").select("amount").eq("user_id", user.id).eq("type", "referral"),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (ledgerRes.data) setTransactions(ledgerRes.data);
    if (loansRes.data) setLoans(loansRes.data);
    if (referralsRes.data) setReferralCount(referralsRes.data.length);
    if (referralEarningsRes.data) {
      setReferralEarnings(referralEarningsRes.data.reduce((sum, r) => sum + r.amount, 0));
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const formatCurrency = (amount: number) =>
    `₳${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getTransactionIcon = (type: string) => {
    if (["deposit", "interest", "referral", "collateral_release", "default_recovery"].includes(type)) {
      return <ArrowDownLeft className="h-4 w-4 text-success" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  };

  const anonymizeBorrower = (borrowerId: string) => `M-${borrowerId.substring(0, 4).toUpperCase()}`;

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
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, Member</p>
        </div>

        {/* Balance Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BalanceCard title="Vault Balance" amount={formatCurrency(profile?.vault_balance ?? 0)} change="" changeType="neutral" icon={Wallet} glowing />
          <BalanceCard title="Lending Balance" amount={formatCurrency(profile?.lending_balance ?? 0)} change="" changeType="neutral" icon={TrendingUp} />
          <BalanceCard title="Frozen Collateral" amount={formatCurrency(profile?.frozen_balance ?? 0)} change="" changeType="neutral" icon={Lock} />
          <BalanceCard title="Referral Earnings" amount={formatCurrency(referralEarnings)} change={`${referralCount} referrals`} changeType="positive" icon={Users} />
        </div>

        {/* Quick Actions + Recent Transactions */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="gold" className="h-auto flex-col gap-2 py-4" onClick={() => setDepositOpen(true)}>
                <ArrowDownLeft className="h-5 w-5" />
                <span className="text-xs">Deposit</span>
              </Button>
              <Button variant="gold-outline" className="h-auto flex-col gap-2 py-4" onClick={() => setWithdrawOpen(true)}>
                <ArrowUpRight className="h-5 w-5" />
                <span className="text-xs">Withdraw</span>
              </Button>
              <Button variant="secondary" className="h-auto flex-col gap-2 py-4">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs">Lend</span>
              </Button>
              <Button variant="secondary" className="h-auto flex-col gap-2 py-4">
                <Users className="h-5 w-5" />
                <span className="text-xs">Refer</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No transactions yet</p>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">{getTransactionIcon(tx.type)}</div>
                        <div>
                          <p className="text-sm font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.amount >= 0 ? "text-success" : "text-destructive"}`}>
                          {tx.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(tx.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{tx.type}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lending Marketplace */}
        <Card className="glass-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Lending Marketplace</CardTitle>
            <Button variant="gold" size="sm">Request Loan</Button>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No open loans in the marketplace</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-3 font-medium">Borrower</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Interest</th>
                      <th className="pb-3 font-medium">Duration</th>
                      <th className="pb-3 font-medium">Collateral</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {loans.map((loan) => (
                      <tr key={loan.id} className="border-b border-border/50">
                        <td className="py-3 font-medium">{anonymizeBorrower(loan.borrower_id)}</td>
                        <td className="py-3">{formatCurrency(loan.principal)}</td>
                        <td className="py-3 text-primary">{loan.interest_rate}%</td>
                        <td className="py-3">{loan.duration_days} days</td>
                        <td className="py-3">{formatCurrency(loan.collateral_amount)}</td>
                        <td className="py-3">
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success capitalize">{loan.status}</span>
                        </td>
                        <td className="py-3">
                          <Button variant="gold-outline" size="sm">Fund</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <DepositModal open={depositOpen} onOpenChange={setDepositOpen} onSuccess={fetchData} />
        <WithdrawalModal open={withdrawOpen} onOpenChange={setWithdrawOpen} vaultBalance={profile?.vault_balance ?? 0} onSuccess={fetchData} />
      </main>
    </div>
  );
};

export default Dashboard;
