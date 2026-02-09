import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User, Mail, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [tier, setTier] = useState("");
  const [kycStatus, setKycStatus] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, referral_code, tier, kyc_status, created_at")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setEmail(data.email);
        setReferralCode(data.referral_code || "");
        setTier(data.tier);
        setKycStatus(data.kyc_status);
        setCreatedAt(data.created_at);
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
    setIsSaving(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

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
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account details</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <Button variant="gold" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Tier</span>
                <span className="text-sm font-semibold capitalize gold-text">{tier}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">KYC Status</span>
                <span className={`text-sm font-semibold capitalize ${kycStatus === "approved" ? "text-success" : "text-primary"}`}>{kycStatus}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-secondary/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="text-sm font-medium">{createdAt ? formatDate(createdAt) : "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" /> Referral Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input value={referralCode || "No code generated"} disabled className="font-mono" />
                {referralCode && (
                  <Button
                    variant="gold-outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                      toast({ title: "Copied!", description: "Referral code copied to clipboard." });
                    }}
                  >
                    Copy
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
