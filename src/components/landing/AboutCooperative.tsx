import { motion } from "framer-motion";
import { Users, Vote, HandCoins, ShieldCheck, GraduationCap, Handshake, Heart } from "lucide-react";

const principles = [
  { icon: Users, title: "Voluntary & Open Membership", desc: "Open to all who accept responsibilities of membership, without discrimination." },
  { icon: Vote, title: "Democratic Member Control", desc: "One member, one vote. Elected representatives are accountable to the membership." },
  { icon: HandCoins, title: "Member Economic Participation", desc: "Members equitably contribute to, and democratically control, the cooperative's capital." },
  { icon: ShieldCheck, title: "Autonomy & Independence", desc: "The cooperative is controlled by its members, maintaining democratic autonomy." },
  { icon: GraduationCap, title: "Education & Training", desc: "Providing education and training for members, officers, and the general public." },
  { icon: Handshake, title: "Cooperation Among Cooperatives", desc: "Serving members most effectively by working together through local and global structures." },
  { icon: Heart, title: "Concern for Community", desc: "Working for sustainable development through policies approved by members." },
];

const AboutCooperative = () => (
  <section id="about" className="py-24">
    <div className="container mx-auto px-6">
      <motion.div
        className="mb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          About <span className="gold-text">₳฿C</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Alpha Bankers Cooperative is a member-owned financial institution built on transparency, sustainable lending, and community growth. We operate under the internationally recognized cooperative principles.
        </p>
      </motion.div>

      <div className="mb-12 text-center">
        <h3 className="font-display text-xl font-semibold mb-2 gold-text">Our Mission</h3>
        <p className="mx-auto max-w-3xl text-muted-foreground">
          To empower every member through accessible, transparent, and sustainable financial services — delivering real lending yields, equitable profit sharing, and community-driven governance.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {principles.map((p, i) => (
          <motion.div
            key={p.title}
            className="glass-card rounded-xl p-5 transition-all hover:glow-gold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
              <p.icon className="h-5 w-5" />
            </div>
            <h4 className="mb-1 font-display text-sm font-semibold">{p.title}</h4>
            <p className="text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default AboutCooperative;
