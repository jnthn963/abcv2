import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users, ArrowDownLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ReferralMember {
  id: string;
  referred_user_id: string;
  level: number;
  created_at: string;
}

interface CommissionEntry {
  id: string;
  amount: number;
  description: string;
  created_at: string;
}

const Referrals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<ReferralMember[]>([]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    const [profileRes, referralsRes, commissionsRes] = await Promise.all([
      supabase.from("profiles").select("referral_code").eq("user_id", user.id).single(),
      supabase.from("referrals").select("id, referred_user_id, level, created_at").eq("user_id", user.id).order("level").order("created_at", { ascending: false }),
      supabase.from("ledger").select("id, amount, description, created_at").eq("user_id", user.id).eq("type", "referral").order("created_at", { ascending: false }),
    ]);

    if (profileRes.data) setReferralCode(profileRes.data.referral_code || "");
    if (referralsRes.data) setReferrals(referralsRes.data);
    if (commissionsRes.data) {
      setCommissions(commissionsRes.data);
      setTotalEarnings(commissionsRes.data.reduce((sum, c) => sum + c.amount, 0));
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: "Copied!", description: "Referral code copied to clipboard." });
  };

  const formatCurrency = (amount: number) =>
    `₳${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const anonymize = (id: string) => `M-${id.substring(0, 4).toUpperCase()}`;

  const getLevelLabel = (level: number) => {
    const labels: Record<number, string> = { 1: "Direct", 2: "Level 2", 3: "Level 3" };
    return labels[level] || `Level ${level}`;
  };

  const getLevelColor = (level: number) => {
    const colors: Record<number, string> = {
      1: "bg-primary/20 text-primary",
      2: "bg-success/20 text-success",
      3: "bg-warning/20 text-warning",
    };
    return colors[level] || "bg-muted text-muted-foreground";
  };

  const levelGroups = [1, 2, 3].map((level) => ({
    level,
    members: referrals.filter((r) => r.level === level),
  }));

  const extractLevel = (desc: string): string => {
    const match = desc.match(/Level (\d)/);
    return match ? match[1] : "—";
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

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold">Referrals</h1>
        <p className="text-sm text-muted-foreground">Invite friends and earn commissions up to 3 levels</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card border-border glow-gold lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display text-lg">Your Referral Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-secondary/50 px-4 py-3 font-display text-xl font-bold tracking-wider text-primary">
                {referralCode || "—"}
              </div>
              <Button variant="gold" size="icon" onClick={copyCode} disabled={!referralCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Share this code with friends. They enter it during registration.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{referrals.length}</p>
                <p className="text-xs text-muted-foreground">Across all levels</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-3">
                <ArrowDownLeft className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{formatCurrency(totalEarnings)}</p>
                <p className="text-xs text-muted-foreground">From referral commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border mb-8">
        <CardHeader>
          <CardTitle className="font-display text-lg">Referral Tree</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {levelGroups.map(({ level, members }) => (
              <div key={level}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getLevelColor(level)}`}>
                    {getLevelLabel(level)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {level === 1 ? "5% commission" : level === 2 ? "3% commission" : "1% commission"}
                  </span>
                </div>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No referrals yet</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{anonymize(member.referred_user_id)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(member.created_at)}</p>
                        </div>
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Active</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No commissions earned yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Level</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {commissions.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50">
                      <td className="py-3 text-muted-foreground">{formatDate(entry.created_at)}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getLevelColor(parseInt(extractLevel(entry.description)) || 1)}`}>
                          Level {extractLevel(entry.description)}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-success">+{formatCurrency(entry.amount)}</td>
                      <td className="py-3 text-muted-foreground">{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Referrals;
