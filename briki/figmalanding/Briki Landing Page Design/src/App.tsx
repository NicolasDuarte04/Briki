import { Navigation } from "./components/Navigation";
import { HeroSection } from "./components/HeroSection";
import { HowItWorks } from "./components/HowItWorks";
import { DemoBlock } from "./components/DemoBlock";
import { FeatureTrio } from "./components/FeatureTrio";
import { SocialProof } from "./components/SocialProof";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <HeroSection />
      <HowItWorks />
      <DemoBlock />
      <FeatureTrio />
      <SocialProof />
      <FinalCTA />
      <Footer />
    </div>
  );
}