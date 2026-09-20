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

  const content = (
    <>
      <span ref={borderRef} className="gradient-button__border" aria-hidden="true" />
      <span className={`gradient-button__content ${className}`}>{children}</span>
    </>
  );

  if (as === "button") {
    return (
      <button
        type="button"
        className={`gradient-button ${containerClassName}`}
        aria-label={ariaLabel}
        onClick={onClick}
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
    >
      {content}
    </a>
  );
}
