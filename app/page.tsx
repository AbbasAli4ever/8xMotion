import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { PartnerMarquee } from "@/components/partner-marquee";
import { PhoneShowcase } from "@/components/phone-showcase";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <PhoneShowcase />
      <PartnerMarquee />
    </main>
  );
}
