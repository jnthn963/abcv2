import { motion } from "framer-motion";
import { pageTransition } from "@/lib/animations";
import { ReactNode } from "react";

const AnimatedPage = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={pageTransition}
    initial="initial"
    animate="animate"
    exit="exit"
  >
    {children}
  </motion.div>
);

export default AnimatedPage;
