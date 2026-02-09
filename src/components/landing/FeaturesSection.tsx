import { motion } from "framer-motion";
import { Wallet, TrendingUp, Users, Shield, Lock, Percent, QrCode, BarChart3, Eye } from "lucide-react";

const features = [
  { icon: Wallet, title: "Vault System", description: "Securely store your funds with full transparency. Track vault, lending, and frozen balances in real time." },
  { icon: TrendingUp, title: "Lending Marketplace", description: "Earn sustainable interest from real borrower payments. No fake yields — only genuine returns from productive lending." },
  { icon: Users, title: "Referral Rewards", description: "Invite members and earn commissions up to 3 levels deep — funded exclusively from deposit fees, never from member funds." },
  { icon: Shield, title: "Reserve Fund Protection", description: "A dedicated reserve fund covers defaults, ensuring lender capital remains protected at all times." },
  { icon: Lock, title: "Collateral Security", description: "All loans are backed by locked collateral. Borrowers must maintain vault balance to access lending." },
  { icon: Percent, title: "Profit Sharing", description: "Annual cooperative profit distribution ensures every member benefits from the system's growth." },
  { icon: QrCode, title: "QR Deposits & Withdrawals", description: "Seamless deposit via QR code and bank transfer withdrawals, all verified by cooperative governors." },
  { icon: BarChart3, title: "Daily Interest Accrual", description: "Automated daily interest distribution calculated pro-rata, credited directly to lender balances." },
  { icon: Eye, title: "Transparent Governance", description: "Governor oversight panel with full visibility into deposits, loans, profits, and system health." },
];

const FeaturesSection = () => (
  <section id="features" className="border-t border-border py-24">
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
            transition={{ delay: i * 0.06 }}
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
);

export default FeaturesSection;
