import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  ArrowDownUp,
  Users,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import alphaCoin from "@/assets/alpha-coin.png";

const memberLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/vault", label: "Vault", icon: Wallet },
  { to: "/dashboard/lending", label: "Lending", icon: TrendingUp },
  { to: "/dashboard/transactions", label: "Transactions", icon: ArrowDownUp },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

const governorLinks = [
  { to: "/governor", label: "Governor Panel", icon: Shield },
  { to: "/governor/settings", label: "System Settings", icon: Settings },
];

const DashboardHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGovernor, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [systemFrozen, setSystemFrozen] = useState(false);

  useEffect(() => {
    const checkFrozen = async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "system_frozen")
        .maybeSingle();
      if (data) setSystemFrozen(data.value === "true");
    };
    checkFrozen();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  const allLinks = isGovernor ? [...memberLinks, ...governorLinks] : memberLinks;

  return (
    <>
      {systemFrozen && (
        <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          System is currently paused — all financial operations are frozen
        </div>
      )}
      <header className="sticky top-0 z-50 border-b border-border bg-sidebar/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src={alphaCoin} alt="" className="h-8 w-8 rounded-full" />
            <span className="font-display text-lg font-bold gold-text">₳฿C</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {memberLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(link.to)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}

            {isGovernor && (
              <>
                <div className="mx-2 h-6 w-px bg-border" />
                {governorLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive(link.to)
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* User Menu (Desktop) */}
          <div className="hidden items-center gap-3 lg:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-sidebar-foreground">
                  <User className="h-4 w-4" />
                  <span className="max-w-[140px] truncate text-xs">
                    {user?.email ?? "Member"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="border-t border-border bg-sidebar px-4 py-4 lg:hidden">
            <nav className="space-y-1">
              {allLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(link.to)
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
              <div className="my-3 border-t border-border" />
              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-sidebar-accent/50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default DashboardHeader;
