"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { FaStarHalfAlt } from "react-icons/fa";
import { GoCheckCircleFill } from "react-icons/go";
import { IoRocketOutline } from "react-icons/io5";
import { LuCrown } from "react-icons/lu";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type PlanId = "creator" | "studio";

const plans = [
  {
    id: "creator" as const,
    name: "Creator",
    eyebrow: "Essential",
    description: "For independent creators turning everyday ideas into polished visuals.",
    monthly: 29,
    yearly: 22,
    features: ["600 generation credits", "HD image and video exports", "Core visual effects", "Personal usage rights"],
    benefits: ["Five concurrent projects", "Reusable style presets", "Community support"],
  },
  {
    id: "studio" as const,
    name: "Studio",
    eyebrow: "Most popular",
    description: "For teams producing campaigns, worlds, and stories at a larger scale.",
    monthly: 79,
    yearly: 62,
    features: ["Everything in Creator", "2,500 generation credits", "4K priority exports", "Commercial usage rights"],
    benefits: ["Unlimited project workspaces", "Priority generation queue", "Team collaboration", "Priority support"],
  },
];

export function PricingSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [activePlan, setActivePlan] = useState<PlanId>("studio");
  const [yearly, setYearly] = useState(false);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        [".pricing-section__header", ".pricing-plans"],
        { y: 52, autoAlpha: 0, filter: "blur(8px)" },
        {
          y: 0,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 0.95,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 78%", once: true },
        },
      );
    }, root);

    return () => context.revert();
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = gsap.utils.toArray<HTMLElement>(".pricing-card", root);

    cards.forEach((card) => {
      const expanded = card.dataset.plan === activePlan;
      const details = card.querySelector<HTMLElement>(".pricing-card__extras");

      gsap.to(card, {
        width: expanded ? "67%" : "31%",
        duration: reduceMotion ? 0 : 0.9,
        ease: "expo.inOut",
        overwrite: true,
      });

      if (details) {
        gsap.to(details, {
          width: expanded ? "43%" : "0%",
          paddingLeft: expanded ? "clamp(1.4rem, 2.5vw, 2.5rem)" : "0rem",
          autoAlpha: expanded ? 1 : 0,
          x: expanded ? 0 : 36,
          duration: reduceMotion ? 0 : expanded ? 0.65 : 0.28,
          delay: expanded && !reduceMotion ? 0.24 : 0,
          ease: "power3.out",
          overwrite: true,
        });
      }
    });
  }, [activePlan]);

  return (
    <section ref={rootRef} className="pricing-section" id="pricing" aria-labelledby="pricing-title">
      <header className="pricing-section__header">
        <span>Choose your pace</span>
        <h2 id="pricing-title">Simple pricing. <em>Limitless stories.</em></h2>
        <p>Start creating today, then scale your credits and collaboration as your ideas grow.</p>
      </header>

      <div className="pricing-plans">
        {plans.map((plan) => {
          const expanded = activePlan === plan.id;
          const price = yearly ? plan.yearly : plan.monthly;

          return (
            <article
              aria-label={`${plan.name} plan`}
              className={`pricing-card${expanded ? " is-expanded" : ""}`}
              data-plan={plan.id}
              key={plan.id}
              onFocusCapture={() => setActivePlan(plan.id)}
              onMouseEnter={() => setActivePlan(plan.id)}
              tabIndex={0}
            >
              <span className="pricing-card__badge">
                {plan.id === "studio" ? <LuCrown aria-hidden="true" /> : <FaStarHalfAlt aria-hidden="true" />}
                {plan.id === "studio" ? "Premium" : "Basic"}
              </span>

              <div className="pricing-card__main">
                <div className="pricing-card__topline">
                  <div>
                    <span className="pricing-card__eyebrow">{plan.eyebrow}</span>
                    <h3>{plan.name}</h3>
                  </div>
                </div>

                <p className="pricing-card__description">{plan.description}</p>
                <div className="pricing-card__features">
                  <h4>Features included</h4>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}><GoCheckCircleFill aria-hidden="true" /><span>{feature}</span></li>
                    ))}
                  </ul>
                </div>

                <div className="pricing-card__footer">
                  <p><strong>${price}</strong><span>/month</span></p>
                  <a href="#">Start creating</a>
                </div>
              </div>

              <div className="pricing-card__extras" aria-hidden={!expanded}>
                <div className="billing-toggle" aria-label="Billing cycle">
                  <button className={!yearly ? "is-active" : ""} onClick={() => setYearly(false)} type="button">Monthly</button>
                  <button className={yearly ? "is-active" : ""} onClick={() => setYearly(true)} type="button">Yearly</button>
                </div>
                <div>
                  <h4>Additional benefits</h4>
                  <ul>
                    {plan.benefits.map((benefit) => (
                      <li key={benefit}><IoRocketOutline aria-hidden="true" /><span>{benefit}</span></li>
                    ))}
                  </ul>
                </div>
                <p className="pricing-card__saving">Save up to 22% with annual billing.</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
