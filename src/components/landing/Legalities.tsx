import { motion } from "framer-motion";
import { Scale, FileText, Building2, PiggyBank, ClipboardCheck, ExternalLink } from "lucide-react";

const items = [
  { icon: FileText, title: "Registration & Charter", desc: "₳฿C is organized and registered in compliance with Republic Act No. 9520 (Philippine Cooperative Code of 2008), ensuring legal standing and protection for all members." },
  { icon: Building2, title: "Governance Structure", desc: "The cooperative maintains a Board of Directors, an Audit Committee, and an Election Committee as required by the CDA. Governors are elected democratically." },
  { icon: PiggyBank, title: "Profit Distribution", desc: "Net surplus is distributed according to CDA regulations: reserve fund (minimum 10%), education & training fund, community development fund, and member patronage refund." },
  { icon: Scale, title: "Member Rights & Obligations", desc: "Every member has the right to vote, receive dividends, inspect records, and participate in general assemblies. Members are obligated to uphold cooperative bylaws." },
  { icon: ClipboardCheck, title: "Audit & Financial Reporting", desc: "Annual financial statements are audited by CDA-accredited auditors. Reports are submitted to the CDA and made available to all members." },
];

const Legalities = () => (
  <section id="legalities" className="border-t border-border bg-card/30 py-24">
    <div className="container mx-auto px-6">
      <motion.div
        className="mb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          CDA <span className="gold-text">Compliance & Legalities</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          ₳฿C operates under the Cooperative Development Authority (CDA) of the Philippines, adhering to all legal requirements for cooperative institutions.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            className="glass-card rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 font-display text-base font-semibold">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-10 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <a
          href="https://www.cda.gov.ph/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          Visit the CDA Official Website
          <ExternalLink className="h-4 w-4" />
        </a>
      </motion.div>
    </div>
  </section>
);

export default Legalities;
