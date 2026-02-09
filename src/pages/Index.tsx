import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Users, Wallet, ArrowRight, Lock, Percent } from "lucide-react";
import alphaCoin from "@/assets/alpha-coin.png";

const features = [
  {
    icon: Wallet,
    title: "Vault System",
    description: "Securely store your funds with full transparency. Track your vault, lending, and frozen balances in real time.",
  },
  {
    icon: TrendingUp,
    title: "Lending Marketplace",
    description: "Earn sustainable interest from real borrower payments. No fake yields — only genuine returns from productive lending.",
  },
  {
    icon: Users,
    title: "Referral Rewards",
    description: "Invite members and earn commissions up to 3 levels deep — funded exclusively from deposit fees, never from member funds.",
  },
  {
    icon: Shield,
    title: "Reserve Fund Protection",
    description: "A dedicated reserve fund covers defaults, ensuring lender capital remains protected at all times.",
  },
  {
    icon: Lock,
    title: "Collateral Security",
    description: "All loans are backed by locked collateral. Borrowers must maintain vault balance to access lending.",
  },
  {
    icon: Percent,
    title: "Profit Sharing",
    description: "Annual cooperative profit distribution ensures every member benefits from the system's growth.",
  },
];

const stats = [
  { label: "Total Deposits", value: "₳2.4M" },
  { label: "Active Members", value: "1,247" },
  { label: "Loans Funded", value: "₳890K" },
  { label: "Avg. Yield", value: "8.2%" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={alphaCoin} alt="Alpha Bankers" className="h-10 w-10 rounded-full" />
            <span className="font-display text-xl font-bold gold-text">₳฿C</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Features</a>
            <a href="#stats" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Stats</a>
            <a href="#about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">About</a>
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

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(43,72%,52%,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(220,30%,20%,0.4),transparent_60%)]" />
        <div className="container relative mx-auto grid gap-12 px-6 lg:grid-cols-2 lg:gap-20">
          <motion.div
            className="flex flex-col justify-center"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Cooperative Banking Reimagined
            </div>
            <h1 className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your Money,{" "}
              <span className="gold-text">Your Power,</span>{" "}
              Our Cooperative
            </h1>
            <p className="mb-8 max-w-lg text-lg text-muted-foreground">
              Alpha Bankers Cooperative delivers sustainable lending yields, transparent governance, and community-driven growth. No fake interest. No hidden fees.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="gold" size="xl" asChild>
                <Link to="/register">
                  Join the Cooperative
                  <ArrowRight className="ml-1" />
                </Link>
              </Button>
              <Button variant="gold-outline" size="xl" asChild>
                <Link to="/login">Member Login</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-[radial-gradient(circle,hsl(43,72%,52%,0.15),transparent_70%)]" />
              <img
                src={alphaCoin}
                alt="Alpha Bankers Cooperative"
                className="relative w-72 drop-shadow-2xl animate-float sm:w-96"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="border-y border-border bg-card/50 py-16">
        <div className="container mx-auto grid grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <p className="font-display text-3xl font-bold gold-text sm:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Built for <span className="gold-text">Sustainable Growth</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Every feature is designed to protect member funds while generating real, transparent returns.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="glass-card group rounded-xl p-6 transition-all hover:glow-gold"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About / CTA */}
      <section id="about" className="border-t border-border py-24">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to <span className="gold-text">Grow Together?</span>
            </h2>
            <p className="mx-auto mt-4 mb-8 max-w-xl text-muted-foreground">
              Join Alpha Bankers Cooperative and be part of a transparent, member-owned financial ecosystem.
            </p>
            <Button variant="gold" size="xl" asChild>
              <Link to="/register">
                Create Your Account
                <ArrowRight className="ml-1" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <img src={alphaCoin} alt="" className="h-6 w-6 rounded-full" />
            <span className="font-display font-semibold gold-text">Alpha Bankers Cooperative</span>
          </div>
          <p>© 2026 ₳฿C. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
