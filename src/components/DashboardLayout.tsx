import { ReactNode } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardFooter from "@/components/DashboardFooter";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 lg:px-6">
        {children}
      </main>
      <DashboardFooter />
    </div>
  );
};

export default DashboardLayout;
