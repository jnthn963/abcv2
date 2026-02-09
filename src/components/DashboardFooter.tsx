import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import alphaCoin from "@/assets/alpha-coin.png";

const DashboardFooter = () => {
  const { isGovernor } = useAuth();

  return (
    <footer className="border-t border-border bg-card/50 pt-12 pb-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Branding / About */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={alphaCoin} alt="" className="h-7 w-7 rounded-full" />
              <h3 className="font-display text-lg font-bold gold-text">₳฿C</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Alpha Bankers Cooperative (₳฿C) is a member-owned cooperative delivering sustainable lending yields, transparent governance, and community-driven growth.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-sm font-semibold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
              <li><Link to="/dashboard/vault" className="hover:text-foreground transition-colors">Vault</Link></li>
              <li><Link to="/dashboard/lending" className="hover:text-foreground transition-colors">Lending</Link></li>
              <li><Link to="/dashboard/transactions" className="hover:text-foreground transition-colors">Transactions</Link></li>
              <li><Link to="/dashboard/referrals" className="hover:text-foreground transition-colors">Referrals</Link></li>
              <li><Link to="/dashboard/settings" className="hover:text-foreground transition-colors">Profile Settings</Link></li>
            </ul>
          </div>

          {/* Governor Links */}
          {isGovernor && (
            <div>
              <h4 className="font-display text-sm font-semibold mb-4 text-foreground">Governor</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><Link to="/governor" className="hover:text-foreground transition-colors">Governor Dashboard</Link></li>
                <li><Link to="/governor/settings" className="hover:text-foreground transition-colors">System Settings</Link></li>
              </ul>
            </div>
          )}

          {/* Contact & Support */}
          <div>
            <h4 className="font-display text-sm font-semibold mb-4 text-foreground">Contact & Support</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href="mailto:support@alphacoop.com" className="hover:text-foreground transition-colors">support@alphacoop.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+63 912 345 6789</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>123 Alpha Street, Makati City, Philippines</span>
              </li>
            </ul>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Legal */}
        <div className="mt-10 border-t border-border pt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© 2026 Alpha Bankers Cooperative (₳฿C). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DashboardFooter;
