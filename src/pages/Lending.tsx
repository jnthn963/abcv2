import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BalanceCard from "@/components/BalanceCard";
import LoanRequestModal from "@/components/LoanRequestModal";
import FundLoanModal from "@/components/FundLoanModal";
import RepayLoanModal from "@/components/RepayLoanModal";
import { TrendingUp, Wallet, Lock, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const Lending = () => {
  const { user } = useAuth();
  const [vaultBalance, setVaultBalance] = useState(0);
  const [lendingBalance, setLendingBalance] = useState(0);
  const [frozenBalance, setFrozenBalance] = useState(0);
  const [marketplaceLoans, setMarketplaceLoans] = useState<Loan[]>([]);
  const [myBorrowedLoans, setMyBorrowedLoans] = useState<Loan[]>([]);
  const [myFundedLoans, setMyFundedLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loanRequestOpen, setLoanRequestOpen] = useState(false);
  const [fundLoanOpen, setFundLoanOpen] = useState(false);
  const [repayLoanOpen, setRepayLoanOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    const [profileRes, marketRes, borrowedRes, fundedRes] = await Promise.all([
      supabase.from("profiles").select("vault_balance, lending_balance, frozen_balance").eq("user_id", user.id).single(),
      supabase.from("loans").select("*").in("status", ["approved", "pending"]).order("created_at", { ascending: false }),
      supabase.from("loans").select("*").eq("borrower_id", user.id).order("created_at", { ascending: false }),
      supabase.from("loans").select("*").eq("lender_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (profileRes.data) {
      setVaultBalance(profileRes.data.vault_balance);
      setLendingBalance(profileRes.data.lending_balance);
      setFrozenBalance(profileRes.data.frozen_balance);
    }
    if (marketRes.data) setMarketplaceLoans(marketRes.data);
    if (borrowedRes.data) setMyBorrowedLoans(borrowedRes.data);
    if (fundedRes.data) setMyFundedLoans(fundedRes.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const formatCurrency = (amount: number) =>
    `₳${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const anonymize = (id: string) => `M-${id.substring(0, 4).toUpperCase()}`;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-primary/10 text-primary",
      approved: "bg-success/10 text-success",
      completed: "bg-muted text-muted-foreground",
      defaulted: "bg-destructive/10 text-destructive",
      rejected: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || "bg-muted text-muted-foreground"}`}>
        {status}
      </span>
    );
  };

  const calcInterest = (loan: Loan) => {
    const days = Math.max(1, Math.ceil((Date.now() - new Date(loan.created_at).getTime()) / 86400000));
    return Math.round(loan.principal * (loan.interest_rate / 100) * (days / 365) * 100) / 100;
  };

  const renderLoanTable = (loans: Loan[], showAction: "fund" | "repay" | "none") => (
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
            {showAction !== "none" && <th className="pb-3 font-medium">Action</th>}
          </tr>
        </thead>
        <tbody className="text-sm">
          {loans.map((loan) => (
            <tr key={loan.id} className="border-b border-border/50">
              <td className="py-3 font-medium">{anonymize(loan.borrower_id)}</td>
              <td className="py-3">{formatCurrency(loan.principal)}</td>
              <td className="py-3 text-primary">{loan.interest_rate}%</td>
              <td className="py-3">{loan.duration_days} days</td>
              <td className="py-3">{formatCurrency(loan.collateral_amount)}</td>
              <td className="py-3">{statusBadge(loan.status)}</td>
              {showAction !== "none" && (
                <td className="py-3">
                  {showAction === "fund" && loan.status === "pending" && loan.borrower_id !== user?.id && (
                    <Button variant="gold-outline" size="sm" onClick={() => { setSelectedLoan(loan); setFundLoanOpen(true); }}>Fund</Button>
                  )}
                  {showAction === "repay" && loan.status === "approved" && (
                    <Button variant="gold" size="sm" onClick={() => { setSelectedLoan(loan); setRepayLoanOpen(true); }}>Repay</Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const activeLoans = myFundedLoans.filter(l => l.status === "approved");

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Lending</h1>
          <p className="text-sm text-muted-foreground">Browse the marketplace, fund loans, or request one</p>
        </div>
        <Button variant="gold" className="w-full sm:w-auto" onClick={() => setLoanRequestOpen(true)}>
          <Landmark className="mr-2 h-4 w-4" /> Request Loan
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard title="Vault Balance" amount={formatCurrency(vaultBalance)} icon={Wallet} />
        <BalanceCard title="Lending Balance" amount={formatCurrency(lendingBalance)} icon={TrendingUp} glowing />
        <BalanceCard title="Frozen Collateral" amount={formatCurrency(frozenBalance)} icon={Lock} />
        <BalanceCard title="Active Funded" amount={activeLoans.length.toString()} change={`${formatCurrency(activeLoans.reduce((s, l) => s + l.principal, 0))} locked`} changeType="neutral" icon={Landmark} />
      </div>

      <Tabs defaultValue="marketplace" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="borrowed">My Loans</TabsTrigger>
          <TabsTrigger value="funded">Funded by Me</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Available Loans</CardTitle>
            </CardHeader>
            <CardContent>
              {marketplaceLoans.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No loans available in the marketplace</p>
              ) : renderLoanTable(marketplaceLoans, "fund")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrowed">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">My Borrowed Loans</CardTitle>
            </CardHeader>
            <CardContent>
              {myBorrowedLoans.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">You haven't borrowed any loans</p>
              ) : (
                <div className="space-y-3">
                  {myBorrowedLoans.map((loan) => {
                    const interest = calcInterest(loan);
                    const total = loan.principal + interest;
                    const daysElapsed = Math.max(1, Math.ceil((Date.now() - new Date(loan.created_at).getTime()) / 86400000));
                    return (
                      <div key={loan.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{formatCurrency(loan.principal)}</p>
                            {statusBadge(loan.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {daysElapsed}/{loan.duration_days} days · Interest: {formatCurrency(interest)} · Total: {formatCurrency(total)}
                          </p>
                          {loan.collateral_amount > 0 && (
                            <p className="text-xs text-muted-foreground">Collateral: {formatCurrency(loan.collateral_amount)} frozen</p>
                          )}
                        </div>
                        {loan.status === "approved" && (
                          <Button variant="gold" size="sm" onClick={() => { setSelectedLoan(loan); setRepayLoanOpen(true); }}>Repay</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funded">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Loans I've Funded</CardTitle>
            </CardHeader>
            <CardContent>
              {myFundedLoans.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">You haven't funded any loans yet</p>
              ) : (
                <div className="space-y-3">
                  {myFundedLoans.map((loan) => {
                    const interest = calcInterest(loan);
                    const daysElapsed = Math.max(1, Math.ceil((Date.now() - new Date(loan.created_at).getTime()) / 86400000));
                    return (
                      <div key={loan.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{formatCurrency(loan.principal)} → {anonymize(loan.borrower_id)}</p>
                            {statusBadge(loan.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {daysElapsed}/{loan.duration_days} days · Earning: {formatCurrency(interest)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LoanRequestModal open={loanRequestOpen} onOpenChange={setLoanRequestOpen} vaultBalance={vaultBalance} frozenBalance={frozenBalance} onSuccess={fetchData} />
      <FundLoanModal open={fundLoanOpen} onOpenChange={setFundLoanOpen} loan={selectedLoan} vaultBalance={vaultBalance} onSuccess={fetchData} />
      <RepayLoanModal open={repayLoanOpen} onOpenChange={setRepayLoanOpen} loan={selectedLoan} vaultBalance={vaultBalance} onSuccess={fetchData} />
    </DashboardLayout>
  );
};

export default Lending;
