import { CircularVideoSlider } from "@/components/circular-video-slider";
import { FinalCta } from "@/components/final-cta";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { PartnerMarquee } from "@/components/partner-marquee";
import { PhoneShowcase } from "@/components/phone-showcase";
import { PricingSection } from "@/components/pricing-section";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <PartnerMarquee />
      <CircularVideoSlider />
      <PhoneShowcase />
      <PricingSection />
      <FinalCta />
    </main>
  );
}
