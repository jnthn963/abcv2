import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import alphaCoin from "@/assets/alpha-coin.png";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(43,72%,52%,0.06),transparent_70%)]" />
      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <img src={alphaCoin} alt="Alpha Bankers" className="h-16 w-16 rounded-full" />
            <span className="font-display text-2xl font-bold gold-text">₳฿C</span>
          </Link>
        </div>

        <Card className="glass-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">Join the Cooperative</CardTitle>
            <CardDescription>Create your member account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" className="bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" className="bg-secondary/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="member@alphabankers.com" className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="bg-secondary/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral">Referral Code (optional)</Label>
              <Input id="referral" placeholder="ABC-XXXX" className="bg-secondary/50" />
            </div>
            <Button variant="gold" className="w-full" size="lg">
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already a member?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
