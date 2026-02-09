import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const LandingCTA = () => (
  <section className="border-t border-border py-24">
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
          Join Alpha Bankers Cooperative and be part of a transparent, member-owned financial ecosystem. Sustainable yields, democratic governance, and community growth await.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="gold" size="xl" asChild>
            <Link to="/register">
              Create Your Account
              <ArrowRight className="ml-1" />
            </Link>
          </Button>
          <Button variant="gold-outline" size="xl" asChild>
            <Link to="/login">Member Login</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  </section>
);

export default LandingCTA;
