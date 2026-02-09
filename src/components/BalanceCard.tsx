import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardHover } from "@/lib/animations";

interface BalanceCardProps {
  title: string;
  amount: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  glowing?: boolean;
}

const BalanceCard = ({ title, amount, change, changeType = "neutral", icon: Icon, glowing }: BalanceCardProps) => {
  return (
    <motion.div
      className={cn("glass-card rounded-xl p-6 transition-shadow", glowing && "glow-gold")}
      whileHover={cardHover}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 font-display text-2xl font-bold">{amount}</p>
          {change && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
};

export default BalanceCard;
