import { motion } from "framer-motion";
import { successCircle, checkmarkDraw } from "@/lib/animations";

interface SuccessAnimationProps {
  title: string;
  description: string;
}

const SuccessAnimation = ({ title, description }: SuccessAnimationProps) => (
  <div className="flex flex-col items-center gap-4 py-8">
    <motion.div
      className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center"
      variants={successCircle}
      initial="hidden"
      animate="show"
    >
      <motion.svg
        className="h-8 w-8 text-success"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <motion.path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
          variants={checkmarkDraw}
          initial="hidden"
          animate="show"
        />
      </motion.svg>
    </motion.div>
    <motion.p
      className="font-display font-semibold"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      {title}
    </motion.p>
    <motion.p
      className="text-sm text-muted-foreground text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      {description}
    </motion.p>
  </div>
);

export default SuccessAnimation;
