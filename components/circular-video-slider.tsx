"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiAperture, FiCamera, FiFilm, FiMapPin, FiZap } from "react-icons/fi";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

const slides = [
  {
    src: "/Circular_Slider/Woman_driving_convertible_on_road_20260921005542.mp4",
    title: "Automotive Motion",
    description: "Turn every road, detail, and movement into a cinematic campaign.",
    Icon: FiZap,
  },
  {
    src: "/Circular_Slider/Woman_entering_hotel_lobby_1080p_20260921005604.mp4",
    title: "Luxury Stories",
    description: "Build polished hospitality visuals with atmosphere and intent.",
    Icon: FiAperture,
  },
  {
    src: "/Circular_Slider/Woman_standing_on_rainy_street_20260921005558.mp4",
    title: "Urban Portraits",
    description: "Create expressive characters inside richly textured city scenes.",
    Icon: FiCamera,
  },
  {
    src: "/Circular_Slider/Woman_walking_on_skyscraper_rooftop_20260921005546.mp4",
    title: "Fashion Films",
    description: "Shape high-impact fashion moments with movement and scale.",
    Icon: FiFilm,
  },
  {
    src: "/Circular_Slider/Woman_walking_through_architectu…_1080p_20260921005552.mp4",
    title: "World Building",
    description: "Place your ideas inside distinctive spaces made to feel real.",
    Icon: FiMapPin,
  },
];

function circularOffset(index: number, activeIndex: number) {
  let offset = index - activeIndex;
  if (offset > slides.length / 2) offset -= slides.length;
  if (offset < -slides.length / 2) offset += slides.length;
  return offset;
}

export function CircularVideoSlider() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = gsap.utils.toArray<HTMLElement>(".circular-slide", root);
    const videos = gsap.utils.toArray<HTMLVideoElement>(".circular-slide video", root);

    const context = gsap.context(() => {
      cards.forEach((card, index) => {
        const offset = circularOffset(index, activeIndex);
        const distance = Math.abs(offset);
        const active = offset === 0;

        card.setAttribute("aria-hidden", String(!active));
        gsap.to(card, {
          xPercent: offset * (distance === 2 ? 84 : 68),
          y: distance === 0 ? 0 : distance === 1 ? 34 : 68,
          z: distance === 0 ? 0 : distance === 1 ? -160 : -300,
          rotationY: offset * -24,
          scale: distance === 0 ? 1 : distance === 1 ? 0.72 : 0.5,
          opacity: distance === 0 ? 1 : distance === 1 ? 0.46 : 0.16,
          filter: distance === 0 ? "blur(0px)" : distance === 1 ? "blur(2px)" : "blur(7px)",
          zIndex: 10 - distance,
          duration: reduceMotion ? 0 : 0.9,
          ease: "power3.inOut",
          overwrite: true,
        });
      });

      videos.forEach((video, index) => {
        if (index === activeIndex) {
          video.currentTime = 0;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });

      if (progressRef.current) {
        gsap.set(progressRef.current, { scaleX: 0, transformOrigin: "left center" });
        gsap.to(progressRef.current, {
          scaleX: 1,
          duration: 5,
          ease: "none",
          onComplete: () => setActiveIndex((current) => (current + 1) % slides.length),
        });
      }
    }, root);

    return () => context.revert();
  }, [activeIndex]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        [".circular-slider__heading", ".circular-slider__stage"],
        { y: 55, autoAlpha: 0, filter: "blur(8px)" },
        {
          y: 0,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 78%", once: true },
        },
      );
    }, root);

    return () => context.revert();
  }, []);

  const activeSlide = slides[activeIndex];
  const ActiveIcon = activeSlide.Icon;

  return (
    <section ref={rootRef} className="circular-slider" aria-labelledby="circular-slider-title">
      <header className="circular-slider__heading">
        <span>Five ways to create</span>
        <h2 id="circular-slider-title">
          Every idea has a <em>story</em>
        </h2>
      </header>

      <div className="circular-slider__stage">
        <div className="circular-slider__orbit">
          {slides.map((slide) => (
            <article className="circular-slide" key={slide.src}>
              <video muted playsInline preload="metadata" loop>
                <source src={slide.src} type="video/mp4" />
              </video>
            </article>
          ))}
        </div>

        <div className="circular-slider__details" key={activeSlide.title}>
          <div className="circular-slider__copy">
            <h3><ActiveIcon aria-hidden="true" />{activeSlide.title}</h3>
            <p>{activeSlide.description}</p>
          </div>
          <HoverBorderGradient containerClassName="circular-slider__cta">
            <span>Try Now</span>
            <FiArrowUpRight aria-hidden="true" />
          </HoverBorderGradient>
        </div>

        <div className="circular-pagination" aria-label="Choose a video category">
          {slides.map((slide, index) => (
            <button
              aria-label={`Show ${slide.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={index === activeIndex ? "is-active" : ""}
              key={slide.title}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              {index === activeIndex && <span ref={progressRef} />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
