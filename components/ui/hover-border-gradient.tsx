"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

type HoverBorderGradientProps = {
  as?: "a" | "button";
  href?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  ariaLabel?: string;
  onClick?: () => void;
};

export function HoverBorderGradient({
  as = "a",
  href = "#",
  children,
  className = "",
  containerClassName = "",
  ariaLabel,
  onClick,
}: HoverBorderGradientProps) {
  const borderRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tween = gsap.to(borderRef.current, {
      rotation: 360,
      duration: 3.6,
      ease: "none",
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, []);

  const setHoverState = (active: boolean) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.killTweensOf([fillRef.current, labelRef.current]);
    gsap.to(fillRef.current, {
      scaleX: active ? 1 : 0,
      duration: reduceMotion ? 0 : active ? 0.48 : 0.34,
      ease: active ? "power3.out" : "power2.inOut",
    });
    gsap.to(labelRef.current, {
      color: active ? "#050505" : "#ffffff",
      duration: reduceMotion ? 0 : 0.22,
      ease: "power2.out",
    });
  };

  const content = (
    <>
      <span ref={borderRef} className="gradient-button__border" aria-hidden="true" />
      <span className={`gradient-button__content ${className}`}>
        <span ref={fillRef} className="gradient-button__fill" aria-hidden="true" />
        <span ref={labelRef} className="gradient-button__label">
          {children}
        </span>
      </span>
    </>
  );

  if (as === "button") {
    return (
      <button
        type="button"
        className={`gradient-button ${containerClassName}`}
        aria-label={ariaLabel}
        onClick={onClick}
        onPointerEnter={() => setHoverState(true)}
        onPointerLeave={() => setHoverState(false)}
        onFocus={() => setHoverState(true)}
        onBlur={() => setHoverState(false)}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={href}
      className={`gradient-button ${containerClassName}`}
      aria-label={ariaLabel}
      onClick={onClick}
      onPointerEnter={() => setHoverState(true)}
      onPointerLeave={() => setHoverState(false)}
      onFocus={() => setHoverState(true)}
      onBlur={() => setHoverState(false)}
    >
      {content}
    </a>
  );
}
