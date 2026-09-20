"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FiArrowUpRight, FiChevronDown, FiMenu, FiX } from "react-icons/fi";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

const links = [
  { label: "Product", dropdown: true },
  { label: "Solutions", dropdown: true },
  { label: "Resources", dropdown: true },
  { label: "Pricing", dropdown: false },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Primary navigation">
        <a href="#" className="navbar__brand" aria-label="8xMotion home">
          <Image src="/BLogo.png" alt="8xMotion" width={1774} height={887} priority />
        </a>

        <div className="navbar__links">
          {links.map((link) => (
            <a href="#" key={link.label}>
              {link.label}
              {link.dropdown && <FiChevronDown aria-hidden="true" />}
            </a>
          ))}
        </div>

        <div className="navbar__action">
          <HoverBorderGradient ariaLabel="Start creating">
            <span>Start Creating</span>
            <FiArrowUpRight aria-hidden="true" />
          </HoverBorderGradient>
        </div>

        <button
          className="navbar__menu-button"
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
      </nav>

      <div
        id="mobile-navigation"
        className={`mobile-menu ${menuOpen ? "mobile-menu--open" : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        {links.map((link) => (
          <a href="#" key={link.label} onClick={() => setMenuOpen(false)}>
            {link.label}
            {link.dropdown && <FiChevronDown aria-hidden="true" />}
          </a>
        ))}
        <HoverBorderGradient
          containerClassName="mobile-menu__cta"
          onClick={() => setMenuOpen(false)}
          ariaLabel="Start creating"
        >
          <span>Start Creating</span>
          <FiArrowUpRight aria-hidden="true" />
        </HoverBorderGradient>
      </div>
    </header>
  );
}
