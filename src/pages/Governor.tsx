import DashboardSidebar from "@/components/DashboardSidebar";
import BalanceCard from "@/components/BalanceCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  TrendingUp,
  Users,
  Shield,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

const pendingDeposits = [
  { id: 1, member: "M-1042", amount: "₳500.00", date: "Feb 8, 2026", proof: "receipt_001.jpg" },
  { id: 2, member: "M-0891", amount: "₳1,200.00", date: "Feb 8, 2026", proof: "receipt_002.jpg" },
];

const Governor = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar isGovernor />
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
          <BalanceCard title="Total Deposits" amount="₳2,432,100" change="+₳45,200 today" changeType="positive" icon={Wallet} glowing />
          <BalanceCard title="Total Lending" amount="₳1,890,000" change="78% utilization" changeType="neutral" icon={TrendingUp} />
          <BalanceCard title="Active Members" amount="1,247" change="+23 this week" changeType="positive" icon={Users} />
          <BalanceCard title="System Income" amount="₳18,420" change="This month" changeType="positive" icon={DollarSign} />
        </div>

        {/* Income Breakdown + Pending Actions */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Income Sources */}
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Income Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Borrower Interest Share", amount: "₳12,300", pct: "67%" },
                { label: "Deposit Fees", amount: "₳3,800", pct: "21%" },
                { label: "Insurance Pool Surplus", amount: "₳1,420", pct: "8%" },
                { label: "Transfer Fees", amount: "₳900", pct: "4%" },
              ].map((source) => (
                <div key={source.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{source.label}</p>
                    <p className="text-xs text-muted-foreground">{source.pct} of total</p>
                  </div>
                  <p className="font-display font-semibold text-primary">{source.amount}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pending Deposits */}
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Pending Deposits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDeposits.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{dep.member}</p>
                    <p className="text-xs text-muted-foreground">{dep.amount} · {dep.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success">
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
              {[
                { label: "Base Interest Rate", value: "12%", desc: "Annual borrower rate" },
                { label: "Lender Share", value: "70%", desc: "Of borrower interest" },
                { label: "Deposit Fee", value: "2%", desc: "On all deposits" },
                { label: "Max Loan Ratio", value: "50%", desc: "Of vault balance" },
                { label: "Capital Lock", value: "28 days", desc: "Minimum lending period" },
                { label: "Min Account Age", value: "6 days", desc: "For loan eligibility" },
              ].map((control) => (
                <div key={control.label} className="rounded-lg bg-secondary/30 p-4">
                  <p className="text-xs text-muted-foreground">{control.label}</p>
                  <p className="mt-1 font-display text-xl font-bold text-primary">{control.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{control.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Governor;
