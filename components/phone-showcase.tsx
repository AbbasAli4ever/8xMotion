"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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

export function PhoneShowcase() {
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
        gsap.to(track, {
          xPercent: -50,
          duration: 42,
          ease: "none",
          repeat: -1,
        });

        gsap.to(".phone-glow", {
          opacity: 0.95,
          scale: 1.28,
          duration: 0.85,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.23,
        });

        gsap.fromTo(
          ".phone-composite",
          { y: 42, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: root,
              start: "top 78%",
              once: true,
            },
          },
        );
      }
    }, root);

    return () => context.revert();
  }, []);

  const reel = [...sliderVideos, ...sliderVideos];

  return (
    <section ref={rootRef} className="phone-showcase" aria-labelledby="phone-showcase-title">
      <h2 id="phone-showcase-title" className="sr-only">
        Create and preview cinematic videos on mobile
      </h2>

      <div className="video-reel" aria-hidden="true">
        <div ref={trackRef} className="video-reel__track">
          {reel.map((src, index) => (
            <div className="video-reel__card" key={`${src}-${index}`}>
              <video autoPlay muted loop playsInline preload="metadata">
                <source src={src} type="video/mp4" />
              </video>
            </div>
          ))}
        </div>
      </div>

      <div className="phone-composite">
        <div className="phone-screen">
          <video autoPlay muted loop playsInline preload="auto">
            <source src="/SliderVideos/phone_vid.mp4" type="video/mp4" />
          </video>
        </div>

        <Image
          className="phone-controls"
          src="/camera.webp"
          alt=""
          fill
          sizes="(max-width: 640px) 68vw, 430px"
          aria-hidden="true"
        />

        <span className="phone-glow phone-glow--flash" aria-hidden="true" />
        <span className="phone-glow phone-glow--camera" aria-hidden="true" />
        <span className="phone-glow phone-glow--battery" aria-hidden="true" />

        <Image
          className="phone-frame"
          src="/phone.webp"
          alt="Phone displaying a looping AI-generated video"
          fill
          priority={false}
          sizes="(max-width: 640px) 68vw, 430px"
        />
      </div>
    </section>
  );
}
