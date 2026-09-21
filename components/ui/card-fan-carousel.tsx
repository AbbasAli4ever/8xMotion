"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import gsap from "gsap";

export interface CardItem {
  imgUrl: string;
  alt?: string;
  linkUrl?: string;
}

type CardFanCarouselProps = { cards: CardItem[] };

const MAX_VISIBLE = 7;
const HALF = 3;
const positions = [
  { rotation: -21, scale: 0.78, x: -30, y: 7.3, zIndex: 1 },
  { rotation: -14, scale: 0.85, x: -22, y: 4, zIndex: 2 },
  { rotation: -7, scale: 0.935, x: -11, y: 1.3, zIndex: 3 },
  { rotation: 0, scale: 1, x: 0, y: 0, zIndex: 10 },
  { rotation: 7, scale: 0.935, x: 11, y: 1.3, zIndex: 3 },
  { rotation: 14, scale: 0.85, x: 22, y: 4, zIndex: 2 },
  { rotation: 21, scale: 0.78, x: 30, y: 7.3, zIndex: 1 },
];

function widthMultiplier(width: number) {
  if (width < 480) return 0.28;
  if (width < 640) return 0.38;
  if (width < 768) return 0.5;
  if (width < 1024) return 0.72;
  return 1;
}

export default function CardFanCarousel({ cards }: CardFanCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const enteredRef = useRef(false);
  const directionRef = useRef<"left" | "right">("right");
  const [centerIndex, setCenterIndex] = useState(cards.length > MAX_VISIBLE ? HALF : cards.length >> 1);

  const visibleMap = useCallback(() => {
    const result = new Map<number, number>();
    if (cards.length <= MAX_VISIBLE) {
      cards.forEach((_, index) => result.set(index, index));
      return result;
    }
    for (let slot = 0; slot < MAX_VISIBLE; slot += 1) {
      result.set((centerIndex + slot - HALF + cards.length) % cards.length, slot);
    }
    return result;
  }, [cards, centerIndex]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>(".fan-card"));
    const map = visibleMap();
    const multiplier = widthMultiplier(window.innerWidth);
    const firstEntry = !enteredRef.current;

    elements.forEach((element, index) => {
      const slot = map.get(index);
      if (slot === undefined) {
        gsap.to(element, {
          x: directionRef.current === "right" ? "-38rem" : "38rem",
          opacity: 0,
          scale: 0.45,
          duration: 0.42,
          ease: "power2.in",
        });
        return;
      }

      const target = positions[slot] ?? positions[HALF];
      if (firstEntry) {
        gsap.set(element, { x: 0, y: "10rem", rotation: 0, scale: 0.5, opacity: 0 });
      }
      gsap.to(element, {
        x: `${target.x * multiplier}rem`,
        y: `${target.y * multiplier}rem`,
        rotation: target.rotation,
        scale: target.scale,
        opacity: 1,
        zIndex: target.zIndex,
        duration: firstEntry ? 1.05 : 0.55,
        delay: firstEntry ? 0.05 * slot : 0,
        ease: firstEntry ? "elastic.out(1,.78)" : "power3.out",
        overwrite: true,
      });
    });

    enteredRef.current = true;
    return () => gsap.killTweensOf(elements);
  }, [centerIndex, visibleMap]);

  const cycle = (direction: "left" | "right") => {
    directionRef.current = direction;
    setCenterIndex((current) => direction === "right" ? (current + 1) % cards.length : (current - 1 + cards.length) % cards.length);
  };

  if (!cards.length) return null;

  return (
    <section className="fan-carousel" aria-label="Image inspiration carousel">
      <div ref={rootRef} className="fan-layout">
        {cards.map((card, index) => (
          <button
            className="fan-card"
            key={`${card.imgUrl}-${index}`}
            onClick={() => {
              directionRef.current = index > centerIndex ? "right" : "left";
              setCenterIndex(index);
            }}
            type="button"
          >
            <Image src={card.imgUrl} alt={card.alt ?? `Inspiration ${index + 1}`} fill sizes="(max-width: 700px) 44vw, 22vw" />
          </button>
        ))}
      </div>
      <div className="fan-controls">
        <button type="button" aria-label="Previous inspiration" onClick={() => cycle("left")}><FiChevronLeft /></button>
        <div>{cards.map((_, index) => <span className={index === centerIndex ? "is-active" : ""} key={index} />)}</div>
        <button type="button" aria-label="Next inspiration" onClick={() => cycle("right")}><FiChevronRight /></button>
      </div>
    </section>
  );
}
