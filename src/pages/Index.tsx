import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import AboutCooperative from "@/components/landing/AboutCooperative";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorks from "@/components/landing/HowItWorks";
import Legalities from "@/components/landing/Legalities";
import Testimonials from "@/components/landing/Testimonials";
import FAQSection from "@/components/landing/FAQSection";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => (
  <div className="min-h-screen bg-background">
    <LandingNav />
    <HeroSection />
    <AboutCooperative />
    <FeaturesSection />
    <HowItWorks />
    <Legalities />
    <Testimonials />
    <FAQSection />
    <LandingCTA />
    <LandingFooter />
  </div>
);

export default Index;
