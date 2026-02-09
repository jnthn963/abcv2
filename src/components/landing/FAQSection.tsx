import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "How does lending yield work?", a: "Lending yield comes exclusively from real borrower interest payments. When you fund a loan, you earn daily pro-rata interest based on the loan's rate and duration. There are no fake or inflated yields — every centavo is backed by actual borrower repayments." },
  { q: "What is the capital lock period?", a: "When you fund a loan, your capital is locked for 28 days minimum. This ensures stability for borrowers and predictable returns for lenders. After the lock period and loan repayment, funds return to your vault balance." },
  { q: "How are referral commissions distributed?", a: "Referral commissions are paid up to 3 levels deep and funded exclusively from the deposit fee pool — never from member funds. Level 1 (direct referral) earns the highest rate, with decreasing rates for Level 2 and Level 3." },
  { q: "How is my money secured?", a: "All loans are backed by locked collateral from the borrower's vault. A dedicated reserve fund covers potential defaults. Governor oversight ensures all transactions are verified, and RLS policies protect your data at the database level." },
  { q: "How can I become a governor?", a: "Governors are elected democratically by the cooperative membership during general assemblies, in accordance with CDA regulations. Governors oversee deposits, withdrawals, loans, and system settings." },
  { q: "What happens if a borrower defaults?", a: "If a borrower fails to repay within the loan duration, their locked collateral is used to cover the outstanding amount. The reserve fund provides additional protection for lender capital." },
  { q: "How does annual profit sharing work?", a: "At the end of each fiscal year, the cooperative distributes net surplus according to CDA rules: reserve fund allocation, education fund, community development fund, and member patronage refunds based on participation." },
  { q: "What are the deposit and withdrawal fees?", a: "A small percentage fee is charged on deposits (used to fund referral commissions and the reserve). Withdrawals incur a fixed ₳15 processing fee. All fees are transparently disclosed before confirmation." },
];

const FAQSection = () => (
  <section id="faq" className="border-t border-border py-24">
    <div className="container mx-auto px-6">
      <motion.div
        className="mb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Frequently Asked <span className="gold-text">Questions</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Everything you need to know about ₳฿C membership and operations.
        </p>
      </motion.div>

      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl border-none px-6">
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export default FAQSection;
