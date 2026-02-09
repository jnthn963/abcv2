import { ReactNode } from "react";
import { motion } from "framer-motion";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";
import { pageTransition } from "@/lib/animations";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <motion.main
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 lg:px-6"
        variants={pageTransition}
        initial="initial"
        animate="animate"
      >
        {children}
      </motion.main>
      <DashboardFooter />
    </div>
  );
};

export default DashboardLayout;
