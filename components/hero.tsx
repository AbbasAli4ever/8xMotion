"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

type MediaCardConfig = {
  src: string;
  alt: string;
  className: string;
  entryX: number;
  entryY: number;
  depth: number;
};

const mediaCards: MediaCardConfig[] = [
  {
    src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=85",
    alt: "Futuristic architecture reaching into a blue sky",
    className: "media-card--one",
    entryX: -130,
    entryY: -90,
    depth: 28,
  },
  {
    src: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85",
    alt: "Performer surrounded by vivid red stage lighting",
    className: "media-card--two",
    entryX: -150,
    entryY: 20,
    depth: 18,
  },
  {
    src: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=1000&q=85",
    alt: "Silhouette watching a cinematic sunset",
    className: "media-card--three",
    entryX: 0,
    entryY: -130,
    depth: 10,
  },
  {
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
    alt: "Person exploring a misty green landscape",
    className: "media-card--four",
    entryX: 140,
    entryY: -70,
    depth: 24,
  },
  {
    src: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1000&q=85",
    alt: "Concert crowd beneath colorful lights",
    className: "media-card--five",
    entryX: -150,
    entryY: 100,
    depth: 14,
  },
  {
    src: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=85",
    alt: "Artist painting with a vibrant color palette",
    className: "media-card--six",
    entryX: 20,
    entryY: 140,
    depth: 22,
  },
  {
    src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1100&q=85",
    alt: "Road crossing a dramatic desert landscape",
    className: "media-card--seven",
    entryX: 150,
    entryY: 110,
    depth: 16,
  },
];

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const root = rootRef.current;
    const stage = stageRef.current;
    const video = videoRef.current;
    const content = contentRef.current;
    if (!root || !stage || !video || !content) return;

    const cards = gsap.utils.toArray<HTMLElement>(".media-card", root);
    const cardMotions = gsap.utils.toArray<HTMLElement>(".media-card__motion", root);
    let parallaxActive = false;

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add(
        {
          desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
          tablet:
            "(min-width: 641px) and (max-width: 1023px) and (prefers-reduced-motion: no-preference)",
          mobile: "(max-width: 640px) and (prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (matchContext) => {
          const { desktop, tablet, mobile, reduce } = matchContext.conditions as Record<
            string,
            boolean
          >;

          if (reduce) {
            gsap.set(video, { clearProps: "all" });
            gsap.set(content, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
            gsap.set(cards, { autoAlpha: 1, scale: 1, x: 0, y: 0 });
            return;
          }

          const visibleCards = mobile ? cards.slice(0, 4) : cards;
          const hiddenCards = mobile ? cards.slice(4) : [];
          gsap.set(hiddenCards, { display: "none" });
          gsap.set(content, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
          gsap.set(visibleCards, {
            autoAlpha: 0,
            scale: 0.68,
            x: (index) => mediaCards[index].entryX,
            y: (index) => mediaCards[index].entryY,
          });

          const timeline = gsap.timeline({
            defaults: { ease: "power3.out" },
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: mobile ? "+=150%" : tablet ? "+=210%" : "+=260%",
              scrub: 1,
              pin: stage,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                parallaxActive = self.progress > 0.53;
              },
            },
          });

          timeline
            .to(
              video,
              {
                width: mobile ? "68vw" : tablet ? "44vw" : "30vw",
                height: mobile ? "19svh" : tablet ? "23svh" : "24svh",
                top: mobile ? "21%" : "22%",
                borderRadius: mobile ? 22 : 30,
                duration: 1.35,
                ease: "power2.inOut",
              },
              0.12,
            )
            .to(".video-shade", { opacity: 0.12, duration: 0.8 }, 0.18)
            .to(
              visibleCards,
              {
                autoAlpha: 1,
                scale: 1,
                x: 0,
                y: 0,
                duration: 0.72,
                stagger: 0.055,
              },
              0.72,
            );

          if (desktop && window.matchMedia("(pointer: fine)").matches) {
            const setters = cardMotions.map((card, index) => ({
              x: gsap.quickTo(card, "x", { duration: 0.8, ease: "power3.out" }),
              y: gsap.quickTo(card, "y", { duration: 0.8, ease: "power3.out" }),
              depth: mediaCards[index].depth,
            }));

            const onPointerMove = (event: PointerEvent) => {
              if (!parallaxActive) return;
              const normalizedX = event.clientX / window.innerWidth - 0.5;
              const normalizedY = event.clientY / window.innerHeight - 0.5;
              setters.forEach((setter) => {
                setter.x(-normalizedX * setter.depth * 2);
                setter.y(-normalizedY * setter.depth * 1.45);
              });
            };

            const resetParallax = () => {
              setters.forEach((setter) => {
                setter.x(0);
                setter.y(0);
              });
            };

            stage.addEventListener("pointermove", onPointerMove);
            stage.addEventListener("pointerleave", resetParallax);
            return () => {
              stage.removeEventListener("pointermove", onPointerMove);
              stage.removeEventListener("pointerleave", resetParallax);
            };
          }
        },
      );

      return () => media.revert();
    }, root);

    return () => context.revert();
  }, []);

  return (
    <section ref={rootRef} className="hero-scroll" aria-labelledby="hero-title">
      <div ref={stageRef} className="hero-stage">
        <div ref={videoRef} className="hero-video">
          <video autoPlay muted loop playsInline preload="metadata" aria-label="8xMotion showreel">
            <source src="/default.mp4" type="video/mp4" />
          </video>
          <span className="video-shade" aria-hidden="true" />
        </div>

        <div className="media-field" aria-hidden="true">
          {mediaCards.map((card) => (
            <div className={`media-card ${card.className}`} key={card.src}>
              <div className="media-card__motion">
                <Image
                  src={card.src}
                  alt={card.alt}
                  fill
                  sizes="(max-width: 640px) 34vw, 18vw"
                />
              </div>
            </div>
          ))}
        </div>

        <div ref={contentRef} className="hero-content">
          <p className="hero-content__eyebrow">AI-powered creative studio</p>
          <h1 id="hero-title">
            WHERE IDEAS BECOME <span>VISUAL STORIES</span>
          </h1>
          <p className="hero-content__copy">
            Create cinematic visuals, characters, and worlds with AI—built for ideas
            that deserve to move.
          </p>
          <HoverBorderGradient containerClassName="hero-content__cta">
            <span>Start Creating</span>
            <FiArrowUpRight aria-hidden="true" />
          </HoverBorderGradient>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
