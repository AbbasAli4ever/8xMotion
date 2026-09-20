"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const partners = [
  { name: "Amazon", src: "/Sliderlogos/amazon (1).svg", compact: false },
  { name: "Discord", src: "/Sliderlogos/discord.svg", compact: true },
  { name: "Disney Plus", src: "/Sliderlogos/disney-plus.svg", compact: true },
  { name: "Facebook", src: "/Sliderlogos/facebook.svg", compact: true },
  { name: "HBO Max", src: "/Sliderlogos/hbo-max.svg", compact: true },
  { name: "Higgsfield", src: "/Sliderlogos/higgsfield-logo.svg", compact: false },
  { name: "Jio", src: "/Sliderlogos/jio.svg", compact: true },
  { name: "Loom", src: "/Sliderlogos/loom.svg", compact: true },
  { name: "Netflix", src: "/Sliderlogos/netflix.svg", compact: true },
  { name: "P&G", src: "/Sliderlogos/pandg.svg", compact: false },
];

export function PartnerMarquee() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!reduceMotion) {
        gsap.fromTo(
          [".partners-heading", ".partners-viewport"],
          { x: 70, autoAlpha: 0, filter: "blur(8px)" },
          {
            x: 0,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.9,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: root,
              start: "top 88%",
              once: true,
            },
          },
        );

        gsap.to(track, {
          xPercent: -50,
          duration: 32,
          repeat: -1,
          ease: "none",
        });
      }

      const logos = gsap.utils.toArray<HTMLElement>(".partner-logo", root);
      const cleanups = logos.map((logo) => {
        const enter = () =>
          gsap.to(logo, {
            opacity: 1,
            scale: 1.06,
            filter: "brightness(1.12) saturate(1.08)",
            duration: reduceMotion ? 0 : 0.24,
            ease: "power2.out",
          });
        const leave = () =>
          gsap.to(logo, {
            opacity: 0.58,
            scale: 1,
            filter: "brightness(0.58) saturate(0.72)",
            duration: reduceMotion ? 0 : 0.28,
            ease: "power2.out",
          });

        logo.addEventListener("pointerenter", enter);
        logo.addEventListener("pointerleave", leave);
        logo.addEventListener("focus", enter);
        logo.addEventListener("blur", leave);
        return () => {
          logo.removeEventListener("pointerenter", enter);
          logo.removeEventListener("pointerleave", leave);
          logo.removeEventListener("focus", enter);
          logo.removeEventListener("blur", leave);
        };
      });

      return () => cleanups.forEach((cleanup) => cleanup());
    }, root);

    return () => context.revert();
  }, []);

  const marqueePartners = [...partners, ...partners];

  return (
    <section ref={rootRef} className="partners-section" aria-labelledby="partners-title">
      <div className="partners-heading">
        <span>Trusted by creative teams</span>
        <h2 id="partners-title">
          Meet our <em>partners</em>
        </h2>
      </div>

      <div className="partners-viewport">
        <div ref={trackRef} className="partners-track">
          {marqueePartners.map((partner, index) => {
            const isDuplicate = index >= partners.length;

            return (
              <div
                aria-hidden={isDuplicate}
                className={`partner-logo ${partner.compact ? "partner-logo--compact" : ""}`}
                key={`${partner.name}-${index}`}
                tabIndex={isDuplicate ? -1 : 0}
              >
                <Image src={partner.src} alt={partner.name} fill sizes="160px" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
