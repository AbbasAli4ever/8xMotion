"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import gsap from "gsap";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

const sliderVideos = [
  "/SliderVideos/Woman_walking_on_terrace_1080p_20260920233855.mp4",
  "/SliderVideos/Woman_walking_on_street_1080p_20260920233851.mp4",
  "/SliderVideos/Woman_walking_in_heritage_courtyard_20260920233919.mp4",
  "/SliderVideos/Woman_turning_toward_camera_1080p_20260920233900.mp4",
  "/SliderVideos/Woman_walking_through_wildflower…_1080p_20260920233910.mp4",
  "/SliderVideos/Woman_walking_on_street_1080p_20260920233900.mp4",
  "/SliderVideos/Woman_smiling_in_luxury_studio_20260920233853.mp4",
  "/SliderVideos/Woman_walking_near_desert_pool_20260920233859.mp4",
  "/SliderVideos/Model_walking_through_Tokyo_alley_20260920233909.mp4",
  "/SliderVideos/Woman_walking_in_futuristic_outfit_20260920233857.mp4",
];

export function LandingHero() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    const context = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.to(track, {
        xPercent: -50,
        duration: 42,
        ease: "none",
        repeat: -1,
      });

      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(".landing-hero__copy > *", {
          y: 34,
          autoAlpha: 0,
          duration: 0.85,
          stagger: 0.09,
        })
        .from(".landing-hero__media", { y: 70, autoAlpha: 0, duration: 1 }, 0.18)
        .from(".landing-phone", { y: 90, autoAlpha: 0, duration: 1.05 }, 0.3);

      gsap.to(".landing-phone__glow", {
        opacity: 0.9,
        scale: 1.25,
        duration: 0.9,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.2,
      });
    }, root);

    return () => context.revert();
  }, []);

  const reel = [...sliderVideos, ...sliderVideos];

  return (
    <section ref={rootRef} className="landing-hero" aria-labelledby="hero-title">
      <div className="landing-hero__copy">
        <p className="landing-hero__eyebrow">
          <Image className="landing-hero__eyebrow-logo" src="/logo.png" alt="" width={22} height={22} aria-hidden="true" />
          AI-powered creative studio
        </p>
        <h1 id="hero-title">
          <span className="landing-hero__title-line">WHERE IDEAS BECOME</span>
          <span className="landing-hero__title-line landing-hero__title-line--accent">VISUAL STORIES</span>
        </h1>
        <p className="landing-hero__description">
          Create cinematic visuals, characters, and worlds with AI—built for ideas that deserve to move.
        </p>
        <div className="landing-hero__actions">
          <a className="landing-hero__primary" href="#showcase-title"><span>Case Studies</span></a>
          <HoverBorderGradient containerClassName="landing-hero__cta" href="#showcase-title">
            <span>Explore Service</span>
            <FiArrowUpRight aria-hidden="true" />
          </HoverBorderGradient>
        </div>
      </div>

      <div className="landing-hero__media" aria-hidden="true">
        <div className="landing-reel">
          <div ref={trackRef} className="landing-reel__track">
            {reel.map((src, index) => (
              <div className="landing-reel__card" key={`${src}-${index}`}>
                <video autoPlay muted loop playsInline preload="metadata">
                  <source src={src} type="video/mp4" />
                </video>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-phone">
          <div className="landing-phone__screen">
            <video autoPlay muted loop playsInline preload="auto">
              <source src="/SliderVideos/phone_vid.mp4" type="video/mp4" />
            </video>
          </div>
          <Image className="landing-phone__controls" src="/camera.webp" alt="" fill sizes="(max-width: 640px) 44vw, 300px" />
          <span className="landing-phone__glow landing-phone__glow--flash" />
          <span className="landing-phone__glow landing-phone__glow--camera" />
          <span className="landing-phone__glow landing-phone__glow--battery" />
          <Image className="landing-phone__frame" src="/phone.webp" alt="" fill priority sizes="(max-width: 640px) 44vw, 300px" />
        </div>
      </div>
    </section>
  );
}
