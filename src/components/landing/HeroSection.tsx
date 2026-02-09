import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import alphaCoin from "@/assets/alpha-coin.png";
const stats = [{
  label: "Total Deposits",
  value: "₳2.4M"
}, {
  label: "Active Members",
  value: "1,247"
}, {
  label: "Loans Funded",
  value: "₳890K"
}, {
  label: "Avg. Yield",
  value: "8.2%"
}];
const HeroSection = () => <>
    <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(43,72%,52%,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(220,30%,20%,0.4),transparent_60%)]" />
      <div className="container relative mx-auto grid gap-12 px-6 lg:grid-cols-2 lg:gap-20">
        <div className="flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Cooperative Banking Reimagined
          </div>
          <h1 className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Your Money,{" "}
            <span className="gold-text">Your Power,</span>{" "}
            Our Cooperative
          </h1>
          <p className="mb-8 max-w-lg text-lg text-muted-foreground">
            Alpha Bankers Cooperative delivers sustainable lending yields, transparent governance, and community-driven growth. No fake interest. No hidden fees.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button variant="gold" size="xl" asChild>
              <Link to="/register">
                Join the Cooperative
                <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button variant="gold-outline" size="xl" asChild>
              <Link to="/login">Member Login</Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-[radial-gradient(circle,hsl(43,72%,52%,0.15),transparent_70%)]" />
            
          </div>
        </div>
      </div>
    </section>

    {/* Stats Bar */}
    <section className="border-y border-border bg-card/50 py-16">
      <div className="container mx-auto grid grid-cols-2 gap-8 px-6 md:grid-cols-4">
        {stats.map(stat => <div key={stat.label} className="text-center">
            <p className="font-display text-3xl font-bold gold-text sm:text-4xl">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>)}
      </div>
    </section>
  </>;
export default HeroSection;