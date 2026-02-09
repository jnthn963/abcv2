import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  ArrowDownUp,
  Users,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import alphaCoin from "@/assets/alpha-coin.png";

const memberLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/vault", label: "Vault", icon: Wallet },
  { to: "/dashboard/lending", label: "Lending", icon: TrendingUp },
  { to: "/dashboard/transactions", label: "Transactions", icon: ArrowDownUp },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isGovernor, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
        <img src={alphaCoin} alt="" className="h-8 w-8 rounded-full" />
        <span className="font-display text-lg font-bold gold-text">₳฿C</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {memberLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}

        {isGovernor && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <Link
              to="/governor"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname.startsWith("/governor")
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              Governor Panel
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
