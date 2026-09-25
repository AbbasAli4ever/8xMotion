"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
    src: "/HeroImages/hero1.jpeg",
    alt: "Futuristic architecture reaching into a blue sky",
    className: "media-card--one",
    entryX: -130,
    entryY: -90,
    depth: 28,
  },
  {
    src: "/HeroImages/hero2.jpeg",
    alt: "Performer surrounded by vivid red stage lighting",
    className: "media-card--two",
    entryX: -150,
    entryY: 20,
    depth: 18,
  },
  {
    src: "/HeroImages/hero3.jpeg",
    alt: "Silhouette watching a cinematic sunset",
    className: "media-card--three",
    entryX: 0,
    entryY: -130,
    depth: 10,
  },
  {
    src: "/HeroImages/hero4.jpeg",
    alt: "Person exploring a misty green landscape",
    className: "media-card--four",
    entryX: 140,
    entryY: -70,
    depth: 24,
  },
  {
    src: "/HeroImages/hero5.jpeg",
    alt: "Concert crowd beneath colorful lights",
    className: "media-card--five",
    entryX: -150,
    entryY: 100,
    depth: 14,
  },
  {
    src: "/HeroImages/hero6.jpeg",
    alt: "Artist painting with a vibrant color palette",
    className: "media-card--six",
    entryX: 20,
    entryY: 140,
    depth: 22,
  },
  {
    src: "/HeroImages/hero7.jpeg",
    alt: "Road crossing a dramatic desert landscape",
    className: "media-card--seven",
    entryX: 150,
    entryY: 110,
    depth: 16,
  },
];

export function CinematicShowcase() {
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
          const { desktop, mobile, reduce } = matchContext.conditions as Record<
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
            autoAlpha: 1,
            scale: 1,
            x: 0,
            y: 0,
          });

          const timeline = gsap.timeline({
            defaults: { ease: "power3.out" },
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom bottom",
              scrub: 2.1,
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
                width: "100%",
                height: "100%",
                top: "50%",
                borderRadius: 0,
                duration: 1.75,
                ease: "power2.inOut",
              },
              0.32,
            )
            .to(".video-shade", { opacity: 1, duration: 0.8 }, 0.38)
            .to(
              visibleCards,
              {
                autoAlpha: 0,
                scale: 0.68,
                x: (index) => mediaCards[index].entryX,
                y: (index) => mediaCards[index].entryY,
                duration: 0.72,
                stagger: 0.055,
              },
              0.42,
            )
            .to(
              content,
              {
                autoAlpha: 0,
                y: 54,
                filter: "blur(14px)",
                duration: 0.62,
              },
              0.48,
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
    <section ref={rootRef} className="hero-scroll" aria-labelledby="showcase-title">
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
          <h1 id="showcase-title">
            CREATE BEYOND <span>THE FRAME</span>
          </h1>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
