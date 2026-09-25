import { CircularVideoSlider } from "@/components/circular-video-slider";
import { FinalCta } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import { CinematicShowcase } from "@/components/hero";
import { LandingHero } from "@/components/landing-hero";
import { Navbar } from "@/components/navbar";
import { PartnerMarquee } from "@/components/partner-marquee";
import { PricingSection } from "@/components/pricing-section";

export default function Home() {
  return (
    <main>
      <Navbar />
      <LandingHero />
      <PartnerMarquee />
      <CircularVideoSlider />
      <CinematicShowcase />
      <PricingSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
