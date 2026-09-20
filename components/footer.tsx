"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { FaInstagram, FaLinkedinIn, FaXTwitter, FaYoutube } from "react-icons/fa6";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const footerGroups = [
  { title: "Start creating", links: ["Create image", "Create video", "Character studio", "Motion control"] },
  { title: "Explore", links: ["AI models", "Visual effects", "Video relight", "World builder"] },
  { title: "Resources", links: ["Tutorials", "Inspiration", "Blog", "Help center"] },
  { title: "Company", links: ["About", "Careers", "Terms", "Privacy"] },
];

const socialLinks = [
  { label: "YouTube", Icon: FaYoutube },
  { label: "Instagram", Icon: FaInstagram },
  { label: "X", Icon: FaXTwitter },
  { label: "LinkedIn", Icon: FaLinkedinIn },
];

export function Footer() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        [".site-footer__brand", ".site-footer__group"],
        { y: 36, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.75,
          stagger: 0.07,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 82%", once: true },
        },
      );
    }, root);

    return () => context.revert();
  }, []);

  return (
    <footer ref={rootRef} className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <a href="#" aria-label="8xMotion home">
            <Image src="/BLogo.png" alt="8xMotion" width={1774} height={887} />
          </a>
          <p>Make ideas move. Build visual stories without limits.</p>
          <div className="site-footer__socials" aria-label="Social media">
            {socialLinks.map(({ label, Icon }) => (
              <a href="#" aria-label={label} key={label}><Icon aria-hidden="true" /></a>
            ))}
          </div>
        </div>

        {footerGroups.map((group) => (
          <nav className="site-footer__group" aria-label={group.title} key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((link) => <a href="#" key={link}>{link}</a>)}
          </nav>
        ))}
      </div>

      <div className="site-footer__bottom-mark" aria-hidden="true">
        <Image src="/BLogo.png" alt="" fill sizes="100vw" />
      </div>
      <div className="site-footer__legal">
        <span>© {new Date().getFullYear()} 8xMotion</span>
        <span>Designed for ideas in motion.</span>
      </div>
    </footer>
  );
}
