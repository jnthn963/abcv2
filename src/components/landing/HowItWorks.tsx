import { motion } from "framer-motion";
import { UserPlus, QrCode, HandCoins, TrendingUp, BarChart3, ShieldCheck } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Register", desc: "Create your account with a referral code from an existing member." },
  { icon: QrCode, title: "Deposit Funds", desc: "Scan the system QR code, transfer funds, and upload proof for governor verification." },
  { icon: HandCoins, title: "Lend or Borrow", desc: "Fund loan requests to earn interest, or request a loan backed by your vault collateral." },
  { icon: TrendingUp, title: "Earn Daily Interest", desc: "Automated daily interest distribution from real borrower payments — no fake yields." },
  { icon: BarChart3, title: "Track Everything", desc: "Monitor your vault, lending balance, transactions, referrals, and profits in real time." },
  { icon: ShieldCheck, title: "Governor Oversight", desc: "Elected governors ensure transparency, approve transactions, and manage system health." },
];

const HowItWorks = () => (
  <section id="how-it-works" className="border-t border-border py-24">
    <div className="container mx-auto px-6">
      <motion.div
        className="mb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          How <span className="gold-text">It Works</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          From registration to profit sharing — your complete member journey.
        </p>
      </motion.div>

      <div className="relative mx-auto max-w-4xl">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 hidden w-px bg-border md:block" />

        <div className="space-y-10">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              className="flex items-start gap-6"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full gold-gradient text-primary-foreground shadow-lg">
                <step.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">
                  <span className="gold-text mr-2">Step {i + 1}.</span>
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default HowItWorks;
