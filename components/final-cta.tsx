"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

export function FinalCta() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        ".final-cta__card",
        { y: 54, scale: 0.975, autoAlpha: 0, filter: "blur(10px)" },
        {
          y: 0,
          scale: 1,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 1.05,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 82%", once: true },
        },
      );

      gsap.fromTo(
        ".final-cta__content > *",
        { y: 24, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.75,
          stagger: 0.11,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 72%", once: true },
        },
      );
    }, root);

    return () => context.revert();
  }, []);

  return (
    <section ref={rootRef} className="final-cta" aria-labelledby="final-cta-title">
      <div className="final-cta__card">
        <Image
          className="final-cta__art"
          src="/CTA_BG.png"
          alt=""
          fill
          sizes="(max-width: 720px) 94vw, 96vw"
          aria-hidden="true"
        />
        <div className="final-cta__overlay" aria-hidden="true" />

        <div className="final-cta__content">
          <span>Ready when you are</span>
          <h2 id="final-cta-title">Create without <em>limits</em></h2>
          <p>
            Bring your ideas to life with cinematic AI tools built for creating,
            refining, and moving without boundaries.
          </p>
          <HoverBorderGradient containerClassName="final-cta__button">
            <span>Start creating — it&apos;s free</span>
            <FiArrowUpRight aria-hidden="true" />
          </HoverBorderGradient>
        </div>
      </div>
    </section>
  );
}
