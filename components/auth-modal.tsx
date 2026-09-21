"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiArrowLeft, FiEye, FiEyeOff, FiMail, FiX } from "react-icons/fi";
import gsap from "gsap";
import { API_URL, ApiError, setAccessToken } from "@/lib/api";

type AuthMode = "login" | "signup";
type AuthStep = "choices" | "email" | "otp";

const mediaSlides = [
  {
    type: "video" as const,
    src: "/Circular_Slider/Woman_walking_through_architectu…_1080p_20260921005552.mp4",
    title: "Worlds with atmosphere",
    caption: "Shape cinematic spaces from a single idea.",
  },
  {
    type: "image" as const,
    src: "/Female_model_posing_in_architecture_20260921034158.jpeg",
    title: "Characters with presence",
    caption: "Create expressive editorial visuals in seconds.",
  },
  {
    type: "video" as const,
    src: "/SliderVideos/Male_boxer_training_heavy_bag_20260921033604.mp4",
    title: "Motion with impact",
    caption: "Turn energy and movement into memorable stories.",
  },
  {
    type: "image" as const,
    src: "/Perfume_bottle_on_stone_20260921034416.jpeg",
    title: "Products made cinematic",
    caption: "Build premium campaign imagery without limits.",
  },
];

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const toggleIndicatorRef = useRef<HTMLSpanElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [mode, setMode] = useState<AuthMode>("signup");
  const [step, setStep] = useState<AuthStep>("choices");
  const [activeMedia, setActiveMedia] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setActiveMedia((current) => (current + 1) % mediaSlides.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeMedia, open]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (open && index === activeMedia) {
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [activeMedia, open]);

  useLayoutEffect(() => {
    if (!open || !modalRef.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        modalRef.current,
        { y: 32, scale: 0.975, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.48, ease: "power3.out" },
      );
    }, modalRef);
    return () => context.revert();
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !toggleIndicatorRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(toggleIndicatorRef.current, {
      xPercent: mode === "signup" ? 100 : 0,
      duration: reduceMotion ? 0 : 0.48,
      ease: "power3.inOut",
      overwrite: true,
    });
  }, [mode, open]);

  if (!open) return null;

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep("choices");
    setOtp(["", "", "", "", "", ""]);
  };

  const completeAuth = () => {
    onClose();
    router.push("/dashboard");
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`${API_URL}/auth/${mode === "signup" ? "signup" : "login"}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new ApiError(response.status, result);
      if (mode === "signup") setStep("otp");
      else { setAccessToken(result.accessToken); completeAuth(); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Authentication failed"); }
    finally { setPending(false); }
  };

  const verifyEmail = async () => {
    setPending(true); setError("");
    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: otp.join("") }) });
      const result = await response.json(); if (!response.ok) throw new ApiError(response.status, result);
      setAccessToken(result.accessToken); completeAuth();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Verification failed"); }
    finally { setPending(false); }
  };

  const resend = async () => {
    setPending(true); setError("");
    try { const response = await fetch(`${API_URL}/auth/resend-verification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const result = await response.json(); if (!response.ok) throw new ApiError(response.status, result); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to resend code"); }
    finally { setPending(false); }
  };

  const updateOtp = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((current) => current.map((item, itemIndex) => (itemIndex === index ? digit : item)));
    if (digit && index < otp.length - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKey = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  return (
    <div className="auth-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={modalRef} className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-modal__close" type="button" onClick={onClose} aria-label="Close authentication modal">
          <FiX aria-hidden="true" />
        </button>

        <section className="auth-showcase" aria-label="Creative examples">
          {mediaSlides.map((slide, index) => (
            <div className={`auth-showcase__slide${index === activeMedia ? " is-active" : ""}`} key={slide.src}>
              {slide.type === "video" ? (
                <video ref={(node) => { videoRefs.current[index] = node; }} muted playsInline loop preload="metadata">
                  <source src={slide.src} type="video/mp4" />
                </video>
              ) : (
                <Image src={slide.src} alt="" fill sizes="(max-width: 820px) 100vw, 48vw" />
              )}
              <div className="auth-showcase__shade" />
              <div className="auth-showcase__copy">
                <span>Made with 8xMotion</span>
                <h2>{slide.title}</h2>
                <p>{slide.caption}</p>
              </div>
            </div>
          ))}
          <div className="auth-showcase__progress" aria-label={`Creative example ${activeMedia + 1} of 4`}>
            {mediaSlides.map((slide, index) => (
              <button aria-label={`Show ${slide.title}`} className={index === activeMedia ? "is-active" : ""} key={slide.title} onClick={() => setActiveMedia(index)} type="button">
                {index === activeMedia && <span key={`${activeMedia}-progress`} />}
              </button>
            ))}
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel__logo"><Image src="/BLogo.png" alt="8xMotion" width={1774} height={887} /></div>
          {step !== "choices" && (
            <button
              className="auth-back"
              type="button"
              onClick={() => setStep(step === "otp" ? "email" : "choices")}
              aria-label="Go back"
            >
              <FiArrowLeft aria-hidden="true" />
            </button>
          )}

          {step === "otp" ? (
            <div className="auth-step auth-view auth-step--otp" key="otp">
              <span className="auth-kicker">Verify your email</span>
              <h2 id="auth-title">Enter your code</h2>
              <p>We sent a six-digit verification code to <strong>{email || "your email"}</strong>.</p>
              <div className="otp-fields">
                {otp.map((digit, index) => (
                  <input
                    aria-label={`OTP digit ${index + 1}`}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    inputMode="numeric"
                    key={index}
                    maxLength={1}
                    onChange={(event) => updateOtp(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKey(event, index)}
                    ref={(node) => { otpRefs.current[index] = node; }}
                    value={digit}
                  />
                ))}
              </div>
              {error && <p role="alert">{error}</p>}
              <button className="auth-primary" type="button" disabled={pending || otp.some((digit) => !digit)} onClick={verifyEmail}>{pending ? "Verifying…" : "Verify email"}</button>
              <button className="auth-resend" type="button" disabled={pending} onClick={resend}>Resend code</button>
            </div>
          ) : step === "choices" ? (
            <div className="auth-step auth-step--choices">
              <div className="auth-toggle" aria-label="Authentication mode">
                <span ref={toggleIndicatorRef} className="auth-toggle__indicator" aria-hidden="true" />
                <button className={mode === "login" ? "is-active" : ""} onClick={() => changeMode("login")} type="button">Log in</button>
                <button className={mode === "signup" ? "is-active" : ""} onClick={() => changeMode("signup")} type="button">Sign up</button>
              </div>

              <div className="auth-choice-content auth-view" key={`${mode}-choices`}>
                <span className="auth-kicker">Your creative workspace</span>
                <h2 id="auth-title">{mode === "login" ? "Welcome back" : "Create without limits"}</h2>
                <p>{mode === "login" ? "Continue where your ideas left off." : "Join 8xMotion and bring your next visual story to life."}</p>

                <a className="auth-google" href={`${API_URL}/auth/google`}>
                  <Image src="/google.svg" alt="" width={22} height={22} />
                  {mode === "login" ? "Continue with Google" : "Sign up with Google"}
                </a>

                <div className="auth-divider"><span>or</span></div>

                <button className="auth-email-choice" type="button" onClick={() => setStep("email")}>
                  <FiMail aria-hidden="true" />{mode === "login" ? "Continue with email" : "Sign up with email"}
                </button>

                <p className="auth-terms">By continuing, you agree to our Terms and Privacy Policy.</p>
              </div>
            </div>
          ) : (
            <div className="auth-step auth-view auth-step--email" key={`${mode}-email`}>
              <span className="auth-kicker">{mode === "login" ? "Continue with email" : "Create your account"}</span>
              <h2 id="auth-title">{mode === "login" ? "Log in with email" : "Tell us about you"}</h2>
              <p>{mode === "login" ? "Enter your email and password to continue." : "Add your details, then verify your email with a six-digit code."}</p>
              <form className="auth-form" onSubmit={submitEmail}>
                {error && <p role="alert">{error}</p>}
                {mode === "signup" && (
                  <div className="auth-form__row">
                    <label><span>First name</span><input name="firstName" autoComplete="given-name" required /></label>
                    <label><span>Last name</span><input name="lastName" autoComplete="family-name" required /></label>
                  </div>
                )}
                <label><span>Email</span><input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
                <label>
                  <span>Password</span>
                  <div className="auth-password">
                    <input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </div>
                </label>
                {mode === "signup" && <label><span>Confirm password</span><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required /></label>}
                <button className="auth-primary" type="submit" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
