import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import alphaCoin from "@/assets/alpha-coin.png";

const DashboardFooter = () => {
  const { isGovernor } = useAuth();

  return (
    <footer className="border-t border-border bg-card/30 py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img src={alphaCoin} alt="" className="h-6 w-6 rounded-full" />
            <span className="font-display font-semibold gold-text">Alpha Bankers Cooperative</span>
          </div>

          {/* Quick Links */}
          <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <Link to="/dashboard/vault" className="hover:text-foreground transition-colors">Vault</Link>
            <Link to="/dashboard/lending" className="hover:text-foreground transition-colors">Lending</Link>
            <Link to="/dashboard/transactions" className="hover:text-foreground transition-colors">Transactions</Link>
            <Link to="/dashboard/referrals" className="hover:text-foreground transition-colors">Referrals</Link>
            {isGovernor && (
              <Link to="/governor/settings" className="hover:text-foreground transition-colors">Governor Settings</Link>
            )}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">© 2026 ₳฿C. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;
