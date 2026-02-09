import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import alphaCoin from "@/assets/alpha-coin.png";

const LandingFooter = () => (
  <footer className="border-t border-border bg-card/30 py-12">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* Branding */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={alphaCoin} alt="" className="h-7 w-7 rounded-full" />
            <h3 className="font-display text-lg font-bold gold-text">₳฿C</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Alpha Bankers Cooperative — a member-owned cooperative delivering sustainable lending yields, transparent governance, and community-driven growth.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-display text-sm font-semibold mb-4 text-foreground">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#about" className="hover:text-foreground transition-colors">About</a></li>
            <li><a href="#features" className="hover:text-foreground transition-colors">Services</a></li>
            <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
            <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
            <li><Link to="/login" className="hover:text-foreground transition-colors">Member Login</Link></li>
            <li><Link to="/register" className="hover:text-foreground transition-colors">Join Now</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-display text-sm font-semibold mb-4 text-foreground">Legal & Compliance</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li><a href="#legalities" className="hover:text-foreground transition-colors">CDA Compliance</a></li>
            <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-foreground transition-colors">Cooperative Bylaws</a></li>
            <li>
              <a href="https://www.cda.gov.ph/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                CDA Official Site ↗
              </a>
            </li>
          </ul>
        </div>

        {/* Contact */}
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
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Facebook"><Facebook className="h-4 w-4" /></a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter"><Twitter className="h-4 w-4" /></a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a>
          </div>
        </div>
      </div>

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

export default LandingFooter;
