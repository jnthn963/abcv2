import DashboardSidebar from "@/components/DashboardSidebar";
import BalanceCard from "@/components/BalanceCard";
import { Wallet, TrendingUp, Lock, Users, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const recentTransactions = [
  { id: 1, type: "deposit", description: "Deposit to Vault", amount: "+₳500.00", date: "Feb 8, 2026", status: "completed" },
  { id: 2, type: "interest", description: "Lending Interest", amount: "+₳12.45", date: "Feb 8, 2026", status: "completed" },
  { id: 3, type: "withdrawal", description: "Withdrawal", amount: "-₳200.00", date: "Feb 7, 2026", status: "pending" },
  { id: 4, type: "referral", description: "Referral Commission", amount: "+₳5.00", date: "Feb 7, 2026", status: "completed" },
];

const loanRequests = [
  { id: 1, borrower: "M-1042", amount: "₳1,000", interest: "12%", duration: "30 days", collateral: "₳500", status: "Open" },
  { id: 2, borrower: "M-0891", amount: "₳2,500", interest: "10%", duration: "60 days", collateral: "₳1,250", status: "Open" },
  { id: 3, borrower: "M-1105", amount: "₳500", interest: "15%", duration: "14 days", collateral: "₳250", status: "Open" },
];

const Dashboard = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isGovernor />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, Member #1001</p>
        </div>

        {/* Balance Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BalanceCard
            title="Vault Balance"
            amount="₳5,420.00"
            change="+₳120.00 this week"
            changeType="positive"
            icon={Wallet}
            glowing
          />
          <BalanceCard
            title="Lending Balance"
            amount="₳3,200.00"
            change="+₳45.30 interest earned"
            changeType="positive"
            icon={TrendingUp}
          />
          <BalanceCard
            title="Frozen Collateral"
            amount="₳800.00"
            change="1 active loan"
            changeType="neutral"
            icon={Lock}
          />
          <BalanceCard
            title="Referral Earnings"
            amount="₳142.50"
            change="12 referrals"
            changeType="positive"
            icon={Users}
          />
        </div>

        {/* Quick Actions + Recent Transactions */}
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="gold" className="h-auto flex-col gap-2 py-4">
                <ArrowDownLeft className="h-5 w-5" />
                <span className="text-xs">Deposit</span>
              </Button>
              <Button variant="gold-outline" className="h-auto flex-col gap-2 py-4">
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

          {/* Recent Transactions */}
          <Card className="glass-card border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        {tx.type === "deposit" || tx.type === "interest" || tx.type === "referral" ? (
                          <ArrowDownLeft className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.amount.startsWith("+") ? "text-success" : "text-destructive"}`}>
                        {tx.amount}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {tx.status === "pending" && <Clock className="h-3 w-3" />}
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
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
                  {loanRequests.map((loan) => (
                    <tr key={loan.id} className="border-b border-border/50">
                      <td className="py-3 font-medium">{loan.borrower}</td>
                      <td className="py-3">{loan.amount}</td>
                      <td className="py-3 text-primary">{loan.interest}</td>
                      <td className="py-3">{loan.duration}</td>
                      <td className="py-3">{loan.collateral}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <Button variant="gold-outline" size="sm">Fund</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
