import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import alphaCoin from "@/assets/alpha-coin.png";

const LandingNav = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
    <div className="container mx-auto flex items-center justify-between px-6 py-4">
      <Link to="/" className="flex items-center gap-3">
        <img src={alphaCoin} alt="Alpha Bankers" className="h-10 w-10 rounded-full" />
        <span className="font-display text-xl font-bold gold-text">₳฿C</span>
      </Link>
      <div className="hidden items-center gap-8 md:flex">
        <a href="#about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">About</a>
        <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Services</a>
        <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How It Works</a>
        <a href="#legalities" className="text-sm text-muted-foreground transition-colors hover:text-foreground">CDA Compliance</a>
        <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/login">Sign In</Link>
        </Button>
        <Button variant="gold" size="sm" asChild>
          <Link to="/register">Get Started</Link>
        </Button>
      </div>
    </div>
  </nav>
);

export default LandingNav;
