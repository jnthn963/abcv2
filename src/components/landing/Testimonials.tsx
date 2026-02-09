import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Maria S.", role: "Member since 2024", quote: "₳฿C changed how I think about savings. My lending yields are real and transparent — no hidden tricks.", rating: 5 },
  { name: "Juan D.", role: "Member since 2025", quote: "The referral system is fair and sustainable. I've grown my network and earned commissions without pressure.", rating: 5 },
  { name: "Ana R.", role: "Member since 2024", quote: "As a borrower, I appreciate the collateral system. It's fair and protects both sides. Repayment is straightforward.", rating: 4 },
  { name: "Carlos M.", role: "Member since 2025", quote: "Governor oversight gives me confidence. Every transaction is tracked, every peso is accounted for.", rating: 5 },
];

const Testimonials = () => (
  <section className="border-t border-border py-24">
    <div className="container mx-auto px-6">
      <motion.div
        className="mb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          What Our <span className="gold-text">Members Say</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Real stories from real members building financial security together.
        </p>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            className="glass-card rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="mb-4 text-sm italic leading-relaxed text-muted-foreground">"{t.quote}"</p>
            <div>
              <p className="font-display text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
