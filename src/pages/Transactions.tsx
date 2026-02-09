import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  reference_id: string | null;
}

const TX_TYPES = [
  { value: "all", label: "All Types" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "interest", label: "Interest" },
  { value: "referral", label: "Referral" },
  { value: "loan_repayment", label: "Loan Repayment" },
  { value: "loan_received", label: "Loan Received" },
  { value: "loan_funding", label: "Loan Funding" },
  { value: "collateral_lock", label: "Collateral Lock" },
  { value: "collateral_release", label: "Collateral Release" },
  { value: "withdrawal_fee", label: "Withdrawal Fee" },
  { value: "default", label: "Default" },
  { value: "default_recovery", label: "Default Recovery" },
];

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    let query = supabase
      .from("ledger")
      .select("id, type, amount, description, created_at, reference_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    const { data } = await query;
    if (data) setTransactions(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, typeFilter]);

  const formatCurrency = (amount: number) =>
    `₳${Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getIcon = (type: string) => {
    if (["deposit", "interest", "referral", "collateral_release", "default_recovery", "loan_received", "loan_repayment_received"].includes(type)) {
      return <ArrowDownLeft className="h-4 w-4 text-success" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  };

  const filtered = transactions.filter((tx) =>
    searchQuery === "" || tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || tx.type.includes(searchQuery.toLowerCase())
  );

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
          <h1 className="font-display text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">Complete history of your financial activity</p>
        </div>

        {/* Filters */}
        <Card className="glass-card border-border mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              {filtered.length} Transaction{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">No transactions found</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
                        {getIcon(tx.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                            {tx.type.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`text-sm font-semibold ${tx.amount >= 0 ? "text-success" : "text-destructive"}`}>
                        {tx.amount >= 0 ? "+" : "-"}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Transactions;
