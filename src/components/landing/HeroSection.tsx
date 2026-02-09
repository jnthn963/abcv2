import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users, Landmark } from "lucide-react";
import alphaCoin from "@/assets/alpha-coin.png";

const stats = [
  { label: "Total Deposits", value: "₳2.4M", icon: Landmark },
  { label: "Active Members", value: "1,247", icon: Users },
  { label: "Loans Funded", value: "₳890K", icon: TrendingUp },
  { label: "Avg. Yield", value: "8.2%", icon: Shield },
];

const HeroSection = () => (
  <>
    <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
      {/* Static gradient backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-[hsl(43,72%,52%,0.06)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(43,72%,52%,0.1),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(220,30%,15%,0.5),transparent_60%)]" />

      <div className="container relative mx-auto grid gap-12 px-6 lg:grid-cols-2 lg:gap-20">
        {/* Left: Content */}
        <div className="flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Cooperative Banking Reimagined
          </div>

          <h1 className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Your Money,{" "}
            <span className="gold-text">Your Power,</span>{" "}
            Our Cooperative
          </h1>

          <p className="mb-8 max-w-lg text-base text-muted-foreground sm:text-lg">
            Alpha Bankers Cooperative delivers sustainable lending yields,
            transparent governance, and community-driven growth. No fake
            interest. No hidden fees.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
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

        {/* Right: Coin illustration */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="absolute -inset-12 rounded-full bg-[radial-gradient(circle,hsl(43,72%,52%,0.12),transparent_70%)]" />
            <div className="relative h-48 w-48 sm:h-64 sm:w-64 lg:h-80 lg:w-80">
              <img
                src={alphaCoin}
                alt="Alpha Bankers Cooperative coin"
                className="h-full w-full object-contain drop-shadow-[0_0_40px_hsl(43,72%,52%,0.25)]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Stats Bar */}
    <section className="border-y border-border bg-card/50 py-12 sm:py-16">
      <div className="container mx-auto grid grid-cols-2 gap-6 px-6 sm:gap-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-2 text-center">
            <stat.icon className="h-5 w-5 text-primary" />
            <p className="font-display text-2xl font-bold gold-text sm:text-3xl lg:text-4xl">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  </>
);

export default HeroSection;
