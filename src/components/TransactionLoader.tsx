import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const MESSAGES = [
  "Securing Connection...",
  "Verifying Ledger...",
  "Finalizing Transaction...",
];

interface TransactionLoaderProps {
  visible: boolean;
  title?: string;
}

const TransactionLoader = ({ visible, title }: TransactionLoaderProps) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!visible) { setMsgIndex(0); return; }
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="relative flex items-center justify-center"
            animate={{
              scale: [1, 1.12, 1],
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Glow ring */}
            <motion.div
              className="absolute h-20 w-20 rounded-full"
              style={{
                background: "radial-gradient(circle, hsla(43, 96%, 56%, 0.3) 0%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* ₳ Symbol */}
            <motion.span
              className="font-display text-4xl font-bold"
              style={{
                color: "hsl(43, 96%, 56%)",
                textShadow: "0 0 20px hsla(43, 96%, 56%, 0.6), 0 0 40px hsla(43, 96%, 56%, 0.3)",
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              ₳
            </motion.span>
          </motion.div>

          {title && (
            <motion.p
              className="mt-4 font-display text-sm font-semibold text-foreground"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {title}
            </motion.p>
          )}

          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              className="mt-2 text-xs text-muted-foreground"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              {MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TransactionLoader;
