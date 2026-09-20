"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  FiAperture,
  FiArrowUpRight,
  FiCamera,
  FiChevronLeft,
  FiChevronRight,
  FiFilm,
  FiMapPin,
  FiZap,
} from "react-icons/fi";
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

function getCarouselSlot(index: number, activeIndex: number) {
  let slot = index - activeIndex;
  if (slot > 2) slot -= slides.length;
  if (slot < -2) slot += slides.length;
  return slot;
}

function getSlotTransform(slot: number) {
  const distance = Math.abs(slot);

  return {
    xPercent: slot * 74,
    y: distance === 0 ? 0 : distance === 1 ? 28 : 58,
    z: distance === 0 ? 0 : distance === 1 ? -130 : -280,
    rotationY: slot * -10,
    scale: distance === 0 ? 1 : distance === 1 ? 0.76 : 0.58,
    opacity: distance === 0 ? 1 : distance === 1 ? 0.42 : 0.08,
    filter: distance === 0 ? "blur(0px)" : distance === 1 ? "blur(5px)" : "blur(11px)",
    zIndex: 10 - distance,
  };
}

export function CircularVideoSlider() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const previousIndexRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const firstRenderRef = useRef(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const navigate = (nextIndex: number, direction: 1 | -1) => {
    if (nextIndex === activeIndex) return;
    previousIndexRef.current = activeIndex;
    directionRef.current = direction;
    setActiveIndex(nextIndex);
  };

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = gsap.utils.toArray<HTMLElement>(".circular-slide", root);
    const videos = gsap.utils.toArray<HTMLVideoElement>(".circular-slide video", root);

    cards.forEach((card, index) => {
      const slot = getCarouselSlot(index, activeIndex);
      const previousSlot = getCarouselSlot(index, previousIndexRef.current);
      const active = slot === 0;
      const wrapsForward = directionRef.current === 1 && previousSlot === -2 && slot === 2;
      const wrapsBackward = directionRef.current === -1 && previousSlot === 2 && slot === -2;
      const wraps = !firstRenderRef.current && (wrapsForward || wrapsBackward);
      const target = getSlotTransform(slot);

      card.setAttribute("aria-hidden", String(!active));

      if (firstRenderRef.current || reduceMotion) {
        gsap.set(card, target);
        return;
      }

      if (wraps) {
        gsap.set(card, { ...target, opacity: 0 });
        gsap.to(card, {
          opacity: target.opacity,
          duration: 0.55,
          delay: 0.28,
          ease: "power2.out",
          overwrite: true,
        });
        return;
      }

      gsap.to(card, {
        ...target,
        duration: 1.15,
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

    const progress = progressRef.current;
    if (progress) {
      gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
      gsap.to(progress, {
        scaleX: 1,
        duration: 5,
        ease: "none",
        onComplete: () => {
          previousIndexRef.current = activeIndex;
          directionRef.current = 1;
          setActiveIndex((current) => (current + 1) % slides.length);
        },
      });
    }

    firstRenderRef.current = false;

    return () => {
      gsap.killTweensOf(cards);
      if (progress) gsap.killTweensOf(progress);
    };
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
        <div className="circular-slider__intro">
          <span>Five ways to create</span>
          <h2 id="circular-slider-title">
            From concept to<br />
            <em>AI videos</em>
          </h2>
          <p>
            Turn ideas into finished films—shape movement, atmosphere, characters,
            and worlds in minutes.
          </p>
        </div>
        <div className="circular-slider__arrows" aria-label="Video carousel controls">
          <button
            aria-label="Previous video"
            onClick={() => navigate((activeIndex - 1 + slides.length) % slides.length, -1)}
            type="button"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <button
            aria-label="Next video"
            onClick={() => navigate((activeIndex + 1) % slides.length, 1)}
            type="button"
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
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
              onClick={() => navigate(index, index < activeIndex ? -1 : 1)}
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
