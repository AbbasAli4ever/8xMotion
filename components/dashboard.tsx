"use client";
/* eslint-disable @next/next/no-img-element -- signed S3 URLs are short-lived and cannot be allowlisted at build time */

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiAlertCircle, FiAlertTriangle, FiArrowLeft, FiAtSign, FiBell, FiCheck, FiChevronRight, FiClock, FiCpu, FiDownload, FiFolder, FiGrid, FiHelpCircle, FiImage, FiLayers, FiLogOut, FiMaximize, FiMenu, FiMinus, FiMonitor, FiMusic, FiPlay, FiPlus, FiSettings, FiSliders, FiStar, FiUpload, FiUser, FiVideo, FiVolume2, FiX, FiZap } from "react-icons/fi";
import { LuCrown } from "react-icons/lu";
import gsap from "gsap";
import { api, ApiError, ApiUser, CapabilityModel, GenerationAsset, refreshSession, setAccessToken } from "@/lib/api";

type CreationMode = "video" | "image";
type ToastKind = "success" | "error" | "warning";
type ToastMessage = { id: number; kind: ToastKind; title: string; message: string };
type ReferenceAsset = { id: string; file: File; previewUrl: string; kind: "image" | "video" | "audio" };
type Plan = { id: string; slug: string; name: string; monthlyPriceCents: number; yearlyPriceCents: number; monthlyCredits: string };
type CreditPack = { id: string; slug: string; name: string; priceCents: number; credits: string };
type Subscription = { id: string; planId?: string; interval: "MONTHLY" | "YEARLY"; status: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean; plan?: Plan };
type WorkspaceTab = "guide" | "history" | "billing" | "profile";
const dashboardVideo = "/dashboard/Explorer_viewing_massive_spacecraft_1080p_20260921052912.mp4";
const imageInspiration = ["hero2.jpeg", "hero5.jpeg", "hero1.jpeg", "hero7.jpeg"];
const videoComingSoon = [{ name: "Seedance 2.5", Icon: FiVideo }, { name: "Kling 2.1", Icon: FiZap }, { name: "Runway Gen-4", Icon: FiStar }, { name: "MiniMax Hailuo", Icon: FiLayers }];
const imageComingSoon = [{ name: "8xMotion Soul", Icon: FiZap }, { name: "GPT Image 2", Icon: FiCpu }, { name: "Seedream 5 Pro", Icon: FiLayers }, { name: "Nano Banana Pro", Icon: FiStar }];
const creditLabel = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);

export function Dashboard() {
  const contentRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<CreationMode>("video");
  const [sourceMode, setSourceMode] = useState<"references" | "extend">("references");
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("guide");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [imageCount, setImageCount] = useState(4);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [credits, setCredits] = useState("0");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityModel[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultAssetId, setResultAssetId] = useState<string | null>(null);
  const [generationRatio, setGenerationRatio] = useState("16:9");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStartedAt, setGenerationStartedAt] = useState(0);
  const [generationDuration, setGenerationDuration] = useState(6000);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const referencesRef = useRef<ReferenceAsset[]>([]);
  useEffect(() => { referencesRef.current = references; }, [references]);
  useEffect(() => () => referencesRef.current.forEach((asset) => URL.revokeObjectURL(asset.previewUrl)), []);
  useEffect(() => {
    void (async () => {
      try {
        if (new URLSearchParams(window.location.search).get("oauth") === "success") await refreshSession();
        const [me, balance, capabilityResult, planResult, packResult, subscriptionResult] = await Promise.all([api<ApiUser>("/users/me"), api<{ balance: string }>("/credits/balance"), api<{ models: CapabilityModel[] }>("/generation-capabilities"), api<Plan[]>("/plans"), api<CreditPack[]>("/credit-packs"), api<Subscription | null>("/subscriptions/me")]);
        const resolvedSubscription = subscriptionResult ? { ...subscriptionResult, plan: subscriptionResult.plan ?? planResult.find((plan) => plan.id === subscriptionResult.planId) } : null;
        setUser(me); setCredits(balance.balance); setCapabilities(capabilityResult.models); setPlans(planResult); setCreditPacks(packResult); setSubscription(resolvedSubscription);
      } catch { /* dashboard remains usable as a signed-out preview */ }
    })();
  }, []);
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(contentRef.current, { x: 22, autoAlpha: 0, filter: "blur(6px)" }, { x: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.58, ease: "power3.out" });
  }, [mode, workspaceTab]);

  useEffect(() => {
    if (!generating || !generationStartedAt) return;
    const update = () => {
      const elapsed = Date.now() - generationStartedAt;
      setGenerationProgress(Math.min(94, Math.round((elapsed / generationDuration) * 100)));
    };
    update();
    const timer = window.setInterval(update, 120);
    return () => window.clearInterval(timer);
  }, [generating, generationDuration, generationStartedAt]);

  const changeMode = (nextMode: CreationMode) => { setMode(nextMode); setGenerated(false); setMobilePanelOpen(false); };
  const refreshAccount = async () => {
    const [me, balance, currentSubscription] = await Promise.all([api<ApiUser>("/users/me"), api<{ balance: string }>("/credits/balance"), api<Subscription | null>("/subscriptions/me")]);
    const resolvedSubscription = currentSubscription ? { ...currentSubscription, plan: currentSubscription.plan ?? plans.find((plan) => plan.id === currentSubscription.planId) } : null;
    setUser(me); setCredits(balance.balance); setSubscription(resolvedSubscription);
  };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setReferences((current) => [...current, ...files.slice(0, Math.max(0, 8 - current.length)).map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), kind: file.type.startsWith("video/") ? "video" as const : file.type.startsWith("audio/") ? "audio" as const : "image" as const }))]);
    event.target.value = "";
    setGenerated(false);
  };
  const removeReference = (id: string) => setReferences((current) => { const removed = current.find((asset) => asset.id === id); if (removed) URL.revokeObjectURL(removed.previewUrl); return current.filter((asset) => asset.id !== id); });
  const startGeneration = async (request: Record<string, unknown>) => {
    const expectedDuration = mode === "image" ? 5000 + Math.round(Math.random() * 2000) : 10000 + Math.round(Math.random() * 5000);
    setGenerationRatio(String(request.aspectRatio ?? "16:9")); setGenerationDuration(expectedDuration); setGenerationStartedAt(Date.now()); setGenerationProgress(1);
    setGenerating(true); setGenerated(false); setResultUrl(null); setResultAssetId(null);
    try {
      const uploadIds = await Promise.all(references.map(async ({ file }) => {
        const signed = await api<{ uploadId: string; uploadUrl: string; headers: Record<string, string> }>("/uploads/presign", { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) });
        const uploaded = await fetch(signed.uploadUrl, { method: "PUT", headers: signed.headers, body: file });
        if (!uploaded.ok) throw new Error(`Could not upload ${file.name}`);
        await api("/uploads/complete", { method: "POST", body: JSON.stringify({ uploadId: signed.uploadId }) });
        return signed.uploadId;
      }));
      const job = await api<{ id: string }>(`/generations/${mode === "image" ? "images" : "videos"}`, { method: "POST", body: JSON.stringify({ ...request, mediaType: mode.toUpperCase(), uploadIds, idempotencyKey: crypto.randomUUID() }) });
      let completed = false;
      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(1000 + attempt * 150, 4000)));
        const status = await api<{ status: string; assets: Array<{ id: string }> }>(`/generations/${job.id}`);
        if (status.status === "SUCCEEDED") { const assetId = status.assets[0].id; const asset = await api<{ previewUrl: string }>(`/assets/${assetId}`); setGenerationProgress(100); setResultAssetId(assetId); setResultUrl(asset.previewUrl); setGenerated(true); setToast({ id: Date.now(), kind: "success", title: "Generation complete", message: `Your ${mode} is ready to view and download.` }); completed = true; break; }
        if (["FAILED", "CANCELLED"].includes(status.status)) throw new Error(`Generation ${status.status.toLowerCase()}`);
      }
      if (!completed) throw new Error("Generation timed out. Your credits will remain protected.");
      const balance = await api<{ balance: string }>("/credits/balance"); setCredits(balance.balance);
    } catch (error) {
      const warning = error instanceof ApiError && error.status === 402;
      setToast({ id: Date.now(), kind: warning ? "warning" : "error", title: warning ? "Not enough credits" : "Generation failed", message: error instanceof Error ? error.message : "Please try again in a moment." });
    }
    finally { setGenerating(false); }
  };

  return (
    <main className={`dashboard-shell dashboard-shell--${mode}`}>
      {toast && <PremiumToast toast={toast} onClose={() => setToast(null)} />}
      <DashboardHeader credits={credits} subscription={subscription} user={user} mode={mode} onModeChange={changeMode} profileOpen={profileOpen} setProfileOpen={setProfileOpen} mobilePanelOpen={mobilePanelOpen} setMobilePanelOpen={setMobilePanelOpen} onOpenAssets={() => setWorkspaceTab("history")} onOpenBilling={() => setWorkspaceTab("billing")} onOpenProfile={() => setWorkspaceTab("profile")} />
      {workspaceTab === "billing" ? <BillingPanel plans={plans} packs={creditPacks} subscription={subscription} onBack={() => setWorkspaceTab("guide")} onChanged={refreshAccount} notify={setToast} /> : workspaceTab === "profile" ? <ProfilePanel user={user} subscription={subscription} credits={credits} onBack={() => setWorkspaceTab("guide")} onChanged={(nextUser) => setUser(nextUser)} notify={setToast} /> : mode === "video" ? (
        <div className="dashboard-body dashboard-body--video">
          <VideoSidebar capabilities={capabilities} fileInputRef={fileInputRef} generating={generating} onFiles={onFiles} onGenerate={startGeneration} onRemoveReference={removeReference} open={mobilePanelOpen} prompt={prompt} references={references} setPrompt={setPrompt} setSourceMode={setSourceMode} sourceMode={sourceMode} />
          {mobilePanelOpen && <button className="dashboard-backdrop" aria-label="Close controls" onClick={() => setMobilePanelOpen(false)} type="button" />}
          <section ref={contentRef} className="dashboard-workspace dashboard-workspace--video">
            {workspaceTab === "history" ? <HistoryPanel generated={generated} onBack={() => setWorkspaceTab("guide")} /> : generating ? <GenerationStage mode="video" progress={generationProgress} ratio={generationRatio} /> : generated ? <GeneratedResult assetId={resultAssetId} mode="video" notify={setToast} ratio={generationRatio} url={resultUrl} /> : <VideoWorkspace generated={false} />}
          </section>
        </div>
      ) : (
        <section ref={contentRef} className="image-dashboard">
          {workspaceTab === "history" ? <HistoryPanel generated={generated} onBack={() => setWorkspaceTab("guide")} /> : generating ? <GenerationStage mode="image" progress={generationProgress} ratio={generationRatio} /> : generated ? <GeneratedResult assetId={resultAssetId} mode="image" notify={setToast} ratio={generationRatio} url={resultUrl} /> : <ImageCreationCanvas capabilities={capabilities} count={imageCount} generating={generating} onFiles={onFiles} onGenerate={startGeneration} onRemoveReference={removeReference} prompt={prompt} references={references} setCount={setImageCount} setPrompt={setPrompt} />}
        </section>
      )}
    </main>
  );
}

type HeaderProps = { credits: string; subscription: Subscription | null; user: ApiUser | null; mode: CreationMode; onModeChange: (mode: CreationMode) => void; profileOpen: boolean; setProfileOpen: (open: boolean) => void; mobilePanelOpen: boolean; setMobilePanelOpen: (open: boolean) => void; onOpenAssets: () => void; onOpenBilling: () => void; onOpenProfile: () => void };
function DashboardHeader({ credits, subscription, user, mode, onModeChange, profileOpen, setProfileOpen, mobilePanelOpen, setMobilePanelOpen, onOpenAssets, onOpenBilling, onOpenProfile }: HeaderProps) {
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profileOpen) return;
    const dismiss = (event: PointerEvent) => { if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [profileOpen, setProfileOpen]);
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "AM";
  const planName = subscription?.plan?.name;
  return <header className="dashboard-header">
    <Link className="dashboard-brand" href="/" aria-label="8xMotion home"><Image src="/BLogo.png" alt="8xMotion" width={1774} height={887} priority /></Link>
    <nav className="dashboard-primary-nav" data-mode={mode} aria-label="Creation mode"><span className="dashboard-primary-nav__indicator" aria-hidden="true" /><button className={mode === "video" ? "is-active" : ""} onClick={() => onModeChange("video")} type="button"><FiVideo /><span>Video</span></button><button className={mode === "image" ? "is-active" : ""} onClick={() => onModeChange("image")} type="button"><FiImage /><span>Image</span></button></nav>
    <div className="dashboard-account"><button className="dashboard-assets-button" type="button" onClick={onOpenAssets}><FiFolder aria-hidden="true" /><span>Assets</span></button><button className="dashboard-icon-button" type="button" aria-label="Notifications"><FiBell aria-hidden="true" /></button><div ref={profileRef} className="profile-menu"><button className="profile-trigger" type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} aria-label="Open profile"><span>{initials}</span></button>{profileOpen && <div className="profile-dropdown profile-dropdown--account"><div className="profile-summary"><span className="profile-summary__avatar">{initials}</span><div><strong>{user ? `${user.firstName} ${user.lastName}` : "Guest user"}</strong><span>{planName ? `${planName} plan` : user ? "Free plan" : "Preview mode"}</span></div></div><div className="profile-credit-card"><div className="profile-credit-card__title"><span>Credits <FiHelpCircle /></span><button type="button" onClick={() => { setProfileOpen(false); onOpenBilling(); }}>{credits} left <FiChevronRight /></button></div><div className="profile-credit-dots" aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} />)}</div><div className="profile-upgrade"><span><LuCrown />{planName ?? "Go Premium"}</span><button type="button" onClick={() => { setProfileOpen(false); onOpenBilling(); }}>{planName ? "Manage" : "Upgrade"}</button></div></div><div className="profile-actions"><button type="button" onClick={() => { setProfileOpen(false); onOpenProfile(); }}><FiUser />Manage profile</button><button type="button" onClick={() => { setProfileOpen(false); onOpenBilling(); }}><FiSettings />Billing & plans</button><Link href="/" onClick={() => { void api("/auth/logout", { method: "POST" }).catch(() => undefined); setAccessToken(null); }}><FiLogOut />Log out</Link></div></div>}</div>{mode === "video" && <button className="dashboard-mobile-toggle" type="button" onClick={() => setMobilePanelOpen(!mobilePanelOpen)} aria-label="Toggle controls">{mobilePanelOpen ? <FiX /> : <FiMenu />}</button>}</div>
  </header>;
}

function BillingPanel({ plans, packs, subscription, onBack, onChanged, notify }: { plans: Plan[]; packs: CreditPack[]; subscription: Subscription | null; onBack: () => void; onChanged: () => Promise<void>; notify: (toast: ToastMessage) => void }) {
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(subscription?.plan?.slug ?? null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const selected = plans.find((plan) => plan.slug === selectedPlan);
  const checkout = async () => {
    if (!selected) return;
    setBusy(selected.slug);
    try {
      await api("/mock-checkout/subscriptions", { method: "POST", body: JSON.stringify({ planSlug: selected.slug, interval }) });
      await onChanged(); setCheckoutOpen(false);
      notify({ id: Date.now(), kind: "success", title: `${selected.name} activated`, message: `${selected.monthlyCredits} credits were added to your account.` });
    } catch (error) { notify({ id: Date.now(), kind: "error", title: "Checkout failed", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(null); }
  };
  const buyPack = async (pack: CreditPack) => {
    setBusy(pack.slug);
    try {
      await api("/mock-checkout/top-ups", { method: "POST", body: JSON.stringify({ packSlug: pack.slug }) });
      await onChanged();
      notify({ id: pack.priceCents, kind: "success", title: "Credits added", message: `${pack.credits} credits are ready to use.` });
    } catch (error) { notify({ id: -pack.priceCents, kind: "error", title: "Purchase failed", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(null); }
  };
  const cancel = async () => {
    setBusy("cancel");
    try { await api("/subscriptions/cancel", { method: "POST" }); await onChanged(); notify({ id: Date.now(), kind: "warning", title: "Cancellation scheduled", message: "Your plan remains active until the end of this billing period." }); }
    catch (error) { notify({ id: Date.now(), kind: "error", title: "Could not cancel", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setBusy(null); }
  };
  return <section className="account-workspace billing-screen">
    <div className="account-screen__top"><button type="button" onClick={onBack}><FiArrowLeft />Back to create</button><div><span>Plans & credits</span><h1>Choose how you create</h1><p>Upgrade your monthly allowance or add credits whenever you need them.</p></div></div>
    {subscription && <div className="current-plan-banner"><span><LuCrown /></span><div><small>Current plan</small><strong>{subscription.plan?.name ?? "Active plan"} · {subscription.interval === "YEARLY" ? "Yearly" : "Monthly"}</strong><p>{subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"} {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p></div>{!subscription.cancelAtPeriodEnd && <button disabled={busy === "cancel"} onClick={cancel} type="button">Cancel plan</button>}</div>}
    <div className="billing-toggle billing-screen__toggle" aria-label="Billing interval"><button className={interval === "MONTHLY" ? "is-active" : ""} onClick={() => setInterval("MONTHLY")} type="button">Monthly</button><button className={interval === "YEARLY" ? "is-active" : ""} onClick={() => setInterval("YEARLY")} type="button">Yearly <span>Save up to 22%</span></button></div>
    <div className="dashboard-plan-grid">{plans.map((plan, index) => { const active = selectedPlan === plan.slug; const price = interval === "MONTHLY" ? plan.monthlyPriceCents / 100 : plan.yearlyPriceCents / 1200; return <article className={`dashboard-plan-card${active ? " is-selected" : ""}`} key={plan.id}><div className="dashboard-plan-card__heading"><span>{index ? <LuCrown /> : <FiStar />}</span><small>{index ? "Premium" : "Creator"}</small></div><h2>{plan.name}</h2><p>{index ? "For ambitious teams and high-volume production." : "Everything an independent creator needs."}</p><div className="dashboard-plan-price"><strong>${Number.isInteger(price) ? price : price.toFixed(0)}</strong><span>/ month</span></div><ul><li><FiCheck />{plan.monthlyCredits} credits every month</li><li><FiCheck />Image and video generation</li><li><FiCheck />Private downloadable assets</li>{index > 0 && <li><FiCheck />Priority generation capacity</li>}</ul><button type="button" className={active ? "is-active" : ""} onClick={() => { setSelectedPlan(plan.slug); setCheckoutOpen(true); }}>{subscription?.plan?.slug === plan.slug ? "Manage plan" : `Choose ${plan.name}`}</button></article>; })}</div>
    <section className="credit-packs"><div><span>Credit top-ups</span><h2>Need a little more?</h2><p>Top-up credits do not expire and are added instantly.</p></div><div className="credit-pack-grid">{packs.map((pack) => <article key={pack.id}><span><FiZap /></span><div><strong>{pack.credits} credits</strong><small>${(pack.priceCents / 100).toFixed(0)} one-time</small></div><button disabled={Boolean(busy)} onClick={() => void buyPack(pack)} type="button">{busy === pack.slug ? "Adding…" : "Buy credits"}</button></article>)}</div></section>
    {checkoutOpen && selected && <div className="checkout-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCheckoutOpen(false); }}><section className="checkout-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="checkout-card__close" type="button" aria-label="Close checkout" onClick={() => setCheckoutOpen(false)}><FiX /></button><span className="checkout-card__icon"><LuCrown /></span><small>Review subscription</small><h2 id="checkout-title">Activate {selected.name}</h2><div className="checkout-summary"><div><span>Billing</span><strong>{interval === "MONTHLY" ? "Monthly" : "Yearly"}</strong></div><div><span>Credits</span><strong>{selected.monthlyCredits} / month</strong></div><div><span>Due today</span><strong>${((interval === "MONTHLY" ? selected.monthlyPriceCents : selected.yearlyPriceCents) / 100).toFixed(0)}</strong></div></div><p>This is a demo checkout. No card or payment details are collected.</p><button className="checkout-submit" disabled={Boolean(busy)} onClick={() => void checkout()} type="button">{busy ? "Activating…" : `Activate ${selected.name}`} <FiChevronRight /></button></section></div>}
  </section>;
}

function ProfilePanel({ user, subscription, credits, onBack, onChanged, notify }: { user: ApiUser | null; subscription: Subscription | null; credits: string; onBack: () => void; onChanged: (user: ApiUser) => void; notify: (toast: ToastMessage) => void }) {
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { const updated = await api<ApiUser>("/users/me", { method: "PATCH", body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }) }); onChanged({ ...user!, ...updated }); notify({ id: Date.now(), kind: "success", title: "Profile updated", message: "Your account details were saved." }); }
    catch (error) { notify({ id: Date.now(), kind: "error", title: "Could not save profile", message: error instanceof Error ? error.message : "Please try again." }); }
    finally { setSaving(false); }
  };
  return <section className="account-workspace profile-screen"><div className="account-screen__top"><button type="button" onClick={onBack}><FiArrowLeft />Back to create</button><div><span>Your account</span><h1>Profile settings</h1><p>Keep your personal details and account information up to date.</p></div></div><div className="profile-screen__grid"><form onSubmit={(event) => { event.preventDefault(); void save(); }}><div className="profile-form__title"><span><FiUser /></span><div><h2>Personal information</h2><p>This information appears in your account menu.</p></div></div><label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} minLength={2} required /></label><label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} minLength={2} required /></label><label>Email<input value={user?.email ?? ""} readOnly /></label><button disabled={saving || firstName.trim().length < 2 || lastName.trim().length < 2} type="submit">{saving ? "Saving…" : "Save changes"}</button></form><aside><span><LuCrown /></span><small>Account overview</small><h2>{subscription?.plan?.name ?? (subscription ? "Active plan" : "Free plan")}</h2><div><span>Available credits</span><strong>{credits}</strong></div><div><span>Membership</span><strong>{subscription?.status?.toLowerCase() ?? "Free"}</strong></div><p>{subscription?.plan ? `${subscription.plan.monthlyCredits} plan credits refresh each month.` : subscription ? "Your subscription is active." : "Upgrade to receive a fresh credit allowance each month."}</p></aside></div></section>;
}

function ReferenceIcon({ kind }: { kind: ReferenceAsset["kind"] }) { return kind === "video" ? <FiVideo /> : kind === "audio" ? <FiMusic /> : <FiImage />; }
function ReferenceChip({ asset, onRemove }: { asset: ReferenceAsset; onRemove: (id: string) => void }) {
  return <article className="reference-chip"><div>{asset.kind === "image" ? <img src={asset.previewUrl} alt="" /> : asset.kind === "video" ? <video src={asset.previewUrl} muted /> : <span><FiMusic /></span>}<i><ReferenceIcon kind={asset.kind} /></i></div><small title={asset.file.name}>{asset.file.name}</small><button type="button" onClick={() => onRemove(asset.id)} aria-label={`Remove ${asset.file.name}`}><FiX /></button></article>;
}

type VideoSidebarProps = { capabilities: CapabilityModel[]; fileInputRef: React.RefObject<HTMLInputElement | null>; generating: boolean; onFiles: (event: ChangeEvent<HTMLInputElement>) => void; onGenerate: (request: Record<string, unknown>) => void; onRemoveReference: (id: string) => void; open: boolean; prompt: string; references: ReferenceAsset[]; setPrompt: (prompt: string) => void; setSourceMode: (mode: "references" | "extend") => void; sourceMode: "references" | "extend" };
function VideoSidebar({ capabilities, fileInputRef, generating, onFiles, onGenerate, onRemoveReference, open, prompt, references, setPrompt, setSourceMode, sourceMode }: VideoSidebarProps) {
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const [openFilter, setOpenFilter] = useState<"model" | "duration" | "ratio" | "quality" | null>(null);
  const [modelMenuPosition, setModelMenuPosition] = useState({ top: 12, left: 420, width: 520 });
  const [model, setModel] = useState("veo-3-1-fast");
  const [duration, setDuration] = useState(4);
  const [ratio, setRatio] = useState("16:9");
  const [quality, setQuality] = useState("480p");
  const models = capabilities.filter((item) => item.mediaType === "VIDEO");
  const selectedModel = models.find((item) => item.slug === model);
  const durations = selectedModel?.capabilities.durations ?? [4, 6, 8];
  const ratios = selectedModel?.capabilities.aspectRatios ?? ["16:9", "9:16"];
  const resolutions = selectedModel?.capabilities.resolutions ?? ["720p", "1080p"];
  const generationCost = Number(selectedModel?.prices.find((price) => price.duration === duration && price.resolution === quality)?.unitCost ?? 0);
  useEffect(() => {
    if (!openFilter) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest(".video-filter-wrap") && !target.closest(".video-model-menu")) setOpenFilter(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [openFilter]);
  const toggleModelMenu = () => {
    if (openFilter === "model") { setOpenFilter(null); return; }
    const rect = modelButtonRef.current?.getBoundingClientRect();
    if (rect) {
      const preferredLeft = rect.right + 12;
      const availableRight = window.innerWidth - preferredLeft - 12;
      const width = Math.min(520, Math.max(300, availableRight));
      const left = availableRight >= 300 ? preferredLeft : Math.max(12, window.innerWidth - Math.min(520, window.innerWidth - 24) - 12);
      setModelMenuPosition({ top: Math.max(12, Math.min(rect.top, window.innerHeight - 500)), left, width: Math.min(width, window.innerWidth - left - 12) });
    }
    setOpenFilter("model");
  };
  const modelMenu = <div className="video-model-menu video-model-menu--portal" style={{ top: modelMenuPosition.top, left: modelMenuPosition.left, width: modelMenuPosition.width }}><small>Available models</small>{models.map((item) => <button className={model === item.slug ? "is-active" : ""} key={item.slug} type="button" onClick={() => { setModel(item.slug); setOpenFilter(null); }}><span className="video-model-menu__icon"><FiVideo /></span><span><strong>{item.displayName}</strong><small>{item.capabilities.resolutions.join(" · ")}</small></span>{model === item.slug && <FiCheck />}</button>)}{videoComingSoon.map(({ name, Icon }) => <button className="is-coming-soon" disabled key={name} type="button"><span className="video-model-menu__icon"><Icon /></span><span><strong>{name} <em>Coming soon</em></strong><small>Model integration in progress</small></span></button>)}</div>;
  return <aside className={`creation-sidebar premium-sidebar${open ? " is-open" : ""}`}>
    <div className="premium-sidebar__scroll">
      <article className="model-preview-card"><video src={dashboardVideo} autoPlay muted loop playsInline preload="metadata" /><div className="model-preview-card__shade" /><div><strong>GENERAL</strong><span>Seedance 2.5</span></div></article>
      <div className="source-switch"><button className={sourceMode === "references" ? "is-active" : ""} onClick={() => setSourceMode("references")} type="button">References</button><button className={sourceMode === "extend" ? "is-active" : ""} onClick={() => setSourceMode("extend")} type="button">Extend Video</button></div>
      <section className={`reference-drop reference-drop--multiple${references.length ? " has-assets" : ""}`}>{references.length ? <><div className="reference-assets-list">{references.map((asset) => <ReferenceChip asset={asset} key={asset.id} onRemove={onRemoveReference} />)}{references.length < 8 && <button className="reference-add-more" type="button" onClick={() => fileInputRef.current?.click()}><FiPlus /><span>Add</span></button>}</div><small>{references.length}/8 references</small></> : <button className="reference-empty" type="button" onClick={() => fileInputRef.current?.click()}><div><span><FiImage /></span><span><FiVideo /></span><span><FiMusic /></span></div><strong>Add references</strong><small>{sourceMode === "extend" ? "Upload videos to extend" : "Image, Video or Audio"}</small></button>}</section>
      <input ref={fileInputRef} hidden multiple type="file" accept={sourceMode === "extend" ? "video/*" : "image/*,video/*,audio/*"} onChange={onFiles} />
      <section className="premium-prompt"><label htmlFor="video-prompt">Prompt <span>{prompt.length}/500</span></label><textarea id="video-prompt" maxLength={500} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the motion, camera, mood, and atmosphere…" /><div><button type="button"><FiAtSign />Elements</button><button type="button"><FiVolume2 />On</button></div></section>
      <div className="video-filter-wrap">
        <button ref={modelButtonRef} className="model-selector" type="button" onClick={toggleModelMenu}><span><small>Model</small><strong>{models.find((item) => item.slug === model)?.displayName ?? "LTX 2.5"} <i><b /><b /><b /></i></strong></span><FiChevronRight /></button>
        {openFilter === "model" && typeof document !== "undefined" ? createPortal(modelMenu, document.body) : null}
      </div>
      <div className="premium-settings">
        <div className="video-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "duration" ? null : "duration")}><FiClock /><span>{duration}s</span></button>{openFilter === "duration" && <div className="video-filter-menu">{durations.map((item) => <button className={duration === item ? "is-active" : ""} key={item} type="button" onClick={() => { setDuration(item); setOpenFilter(null); }}><span>{item}s</span>{duration === item && <FiCheck />}</button>)}</div>}</div>
        <div className="video-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "ratio" ? null : "ratio")}><FiMaximize /><span>{ratio}</span></button>{openFilter === "ratio" && <div className="video-filter-menu">{ratios.map((item) => <button className={ratio === item ? "is-active" : ""} key={item} type="button" onClick={() => { setRatio(item); setOpenFilter(null); }}><span>{item}</span>{ratio === item && <FiCheck />}</button>)}</div>}</div>
        <div className="video-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "quality" ? null : "quality")}><FiGrid /><span>{quality}</span></button>{openFilter === "quality" && <div className="video-filter-menu">{resolutions.map((item) => <button className={quality === item ? "is-active" : ""} key={item} type="button" onClick={() => { setQuality(item); setOpenFilter(null); }}><span>{item}</span>{quality === item && <FiCheck />}</button>)}</div>}</div>
      </div>
    </div>
    <button className="premium-generate" type="button" disabled={generating || !prompt.trim() || !selectedModel || !generationCost} onClick={() => onGenerate({ model, prompt, duration, aspectRatio: ratio, resolution: quality, count: 1 })}>{generating ? <><span className="generate-spinner" />Generating…</> : <>Generate <FiZap /><strong>{creditLabel(generationCost)}</strong></>}</button>
  </aside>;
}

function VideoWorkspace({ generated }: { generated: boolean }) {
  const createSteps = [{ image: "hero2.jpeg", title: "Add image", copy: "Upload or choose an image to begin your animation.", Icon: FiUpload }, { image: "hero5.jpeg", title: "Choose preset", copy: "Pick a motion style to guide camera and subject movement.", Icon: FiSliders }, { image: "hero7.jpeg", title: "Get video", copy: "Generate your final cinematic clip and download it.", Icon: FiPlay }];
  if (generated) return <GeneratedResult mode="video" ratio="16:9" />;
  return <div className="workspace-guide"><div className="workspace-heading"><span>Image to video</span><h1>Make videos in one click</h1><p>Upload an image, choose a movement preset, and turn a still moment into a cinematic story.</p></div><div className="guide-steps guide-steps--arc">{createSteps.map(({ image, title, copy, Icon }, index) => <article key={title}><GuideVisual image={image} index={index} Icon={Icon} /><h2>{title}</h2><p>{copy}</p></article>)}</div></div>;
}

function GuideVisual({ image, index, Icon }: { image: string; index: number; Icon: React.ComponentType }) {
  if (index === 0) return <div className="guide-demo guide-demo--upload"><div className="guide-upload-placeholder"><FiImage /><strong>Upload image</strong><small>or paste from clipboard</small></div><div className="guide-floating-image"><Image src={`/HeroImages/${image}`} alt="Image upload example" fill sizes="28vw" /></div><Icon /></div>;
  if (index === 1) return <div className="guide-demo guide-demo--presets guide-demo--video"><video src="/dashboard/UI_interaction_animation_for_web…_20260921161116.mp4" autoPlay muted loop playsInline preload="metadata" /><Icon /></div>;
  return <div className="guide-demo guide-demo--result"><video src="/dashboard/Generate_video_from_image_1080p_20260921161352.mp4" autoPlay muted loop playsInline preload="metadata" /><div className="guide-result-frame" /><Icon /></div>;
}

type ImageCanvasProps = { capabilities: CapabilityModel[]; count: number; generating: boolean; onFiles: (event: ChangeEvent<HTMLInputElement>) => void; onGenerate: (request: Record<string, unknown>) => void; onRemoveReference: (id: string) => void; prompt: string; references: ReferenceAsset[]; setCount: (count: number) => void; setPrompt: (prompt: string) => void };
function ImageCreationCanvas({ capabilities, count, generating, onFiles, onGenerate, onRemoveReference, prompt, references, setCount, setPrompt }: ImageCanvasProps) {
  const imageReferenceInputRef = useRef<HTMLInputElement>(null);
  const [openFilter, setOpenFilter] = useState<"model" | "ratio" | "quality" | "resolution" | null>(null);
  const [model, setModel] = useState("imagen-4-fast");
  const [ratio, setRatio] = useState("16:9");
  const [quality, setQuality] = useState("High");
  const [resolution, setResolution] = useState("1K");
  const models = capabilities.filter((item) => item.mediaType === "IMAGE");
  const selectedModel = models.find((item) => item.slug === model);
  const ratios = selectedModel?.capabilities.aspectRatios ?? ["16:9", "9:16"];
  const resolutions = selectedModel?.capabilities.resolutions ?? ["1K", "2K"];
  const qualities = selectedModel?.capabilities.qualities ?? ["High"];
  const unitCost = Number(selectedModel?.prices.find((price) => price.duration === null && price.resolution === resolution)?.unitCost ?? 0);
  const generationCost = unitCost * count;
  useEffect(() => {
    if (!openFilter) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest(".image-filter-wrap") && !target.closest(".image-model-menu")) setOpenFilter(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [openFilter]);
  return <div className="image-creation-canvas"><div className="image-creation-hero"><AnimatedImageArc /><h1>Start creating with<br /><span>8xMotion Soul Cinema</span></h1><p>Describe a scene, character, mood, or style — and watch it come to life.</p></div><div className="image-composer">{references.length > 0 && <div className="image-composer__references">{references.map((asset) => <ReferenceChip asset={asset} key={asset.id} onRemove={onRemoveReference} />)}</div>}<div className="image-composer__input"><button className="image-reference-add" type="button" aria-label="Add reference images" onClick={() => imageReferenceInputRef.current?.click()}><FiPlus /></button><input ref={imageReferenceInputRef} hidden multiple type="file" accept="image/*" onChange={onFiles} /><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the scene you imagine" rows={1} /></div><div className="image-composer__bottom"><div className="image-composer__options">
    <div className="image-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "model" ? null : "model")}><FiCpu />{selectedModel?.displayName ?? "Flux Schnell"}<FiChevronRight /></button>{openFilter === "model" && <div className="image-model-menu"><small>Available models</small>{models.map((item) => <button className={model === item.slug ? "is-active" : ""} key={item.slug} type="button" onClick={() => { setModel(item.slug); setOpenFilter(null); }}><span><FiCpu /></span><span><strong>{item.displayName}</strong><small>Available now</small></span>{model === item.slug && <FiCheck />}</button>)}{imageComingSoon.map(({ name, Icon }) => <button className="is-coming-soon" disabled key={name} type="button"><span><Icon /></span><span><strong>{name} <em>Coming soon</em></strong><small>Model integration in progress</small></span></button>)}</div>}</div>
    <div className="image-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "ratio" ? null : "ratio")}><FiMaximize />{ratio}</button>{openFilter === "ratio" && <ImageOptionMenu title="Aspect ratio" value={ratio} options={ratios} onSelect={(value) => { setRatio(value); setOpenFilter(null); }} />}</div>
    <div className="image-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "quality" ? null : "quality")}><FiStar />{quality}</button>{openFilter === "quality" && <ImageOptionMenu title="Select quality" value={quality} options={qualities} descriptions={{ Low: "Fastest and cheapest", Medium: "Balanced visuals", High: "Best visual fidelity" }} onSelect={(value) => { setQuality(value); setOpenFilter(null); }} />}</div>
    <div className="image-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "resolution" ? null : "resolution")}><FiMonitor />{resolution}</button>{openFilter === "resolution" && <ImageOptionMenu title="Select resolution" value={resolution} options={resolutions} descriptions={{ "1K": "1024px", "2K": "2048px" }} onSelect={(value) => { setResolution(value); setOpenFilter(null); }} />}</div>
    <div className="count-stepper"><button type="button" aria-label="Decrease count" onClick={() => setCount(Math.max(1, count - 1))}><FiMinus /></button><span>{count}/{selectedModel?.capabilities.maxCount ?? 4}</span><button type="button" aria-label="Increase count" onClick={() => setCount(Math.min(selectedModel?.capabilities.maxCount ?? 4, count + 1))}><FiPlus /></button></div></div><button className="image-generate" type="button" disabled={generating || !prompt.trim() || !selectedModel || !generationCost} onClick={() => onGenerate({ model, prompt, aspectRatio: ratio, quality, resolution, count })}>{generating ? "Creating…" : <>Generate <FiZap /><strong>{creditLabel(generationCost)}</strong></>}</button></div></div></div>;
}

function ImageOptionMenu({ title, value, options, descriptions, onSelect }: { title: string; value: string; options: string[]; descriptions?: Record<string, string>; onSelect: (value: string) => void }) {
  return <div className="image-option-menu"><strong>{title}</strong>{options.map((option) => <button className={value === option ? "is-active" : ""} key={option} type="button" onClick={() => onSelect(option)}><span><b>{option}</b>{descriptions?.[option] && <small>{descriptions[option]}</small>}</span>{value === option && <FiCheck />}</button>)}</div>;
}

function AnimatedImageArc() {
  const arcRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = arcRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".image-arc-card"));
    const positions = [
      { x: -11.4, y: 1.25, rotation: -10, scale: 0.88, zIndex: 1 },
      { x: -4, y: 0, rotation: -3.5, scale: 0.97, zIndex: 3 },
      { x: 4, y: 0, rotation: 3.5, scale: 0.97, zIndex: 3 },
      { x: 11.4, y: 1.25, rotation: 10, scale: 0.88, zIndex: 1 },
    ];
    const multiplier = window.innerWidth < 520 ? 0.55 : window.innerWidth < 900 ? 0.78 : 1;

    cards.forEach((card, index) => {
      const base = positions[index];
      gsap.fromTo(card, { x: 0, y: "7rem", rotation: 0, scale: 0.55, autoAlpha: 0 }, { x: `${base.x * multiplier}rem`, y: `${base.y}rem`, rotation: base.rotation, scale: base.scale, autoAlpha: 1, zIndex: base.zIndex, duration: 1.05, delay: 0.08 * index, ease: "elastic.out(1,.76)" });
    });

    const cleanups = cards.map((card, hoveredIndex) => {
      const enter = () => cards.forEach((item, index) => {
        const base = positions[index];
        const direction = index < hoveredIndex ? -1 : index > hoveredIndex ? 1 : 0;
        gsap.to(item, { x: `${(base.x + direction * 2.8) * multiplier}rem`, y: `${base.y - (index === hoveredIndex ? 1.8 : 0)}rem`, rotation: base.rotation + direction * 1.8, scale: index === hoveredIndex ? base.scale * 1.08 : base.scale, duration: 0.48, ease: "elastic.out(1,.75)", overwrite: true });
      });
      card.addEventListener("mouseenter", enter);
      return () => card.removeEventListener("mouseenter", enter);
    });
    const leave = () => cards.forEach((card, index) => {
      const base = positions[index];
      gsap.to(card, { x: `${base.x * multiplier}rem`, y: `${base.y}rem`, rotation: base.rotation, scale: base.scale, duration: 0.48, ease: "elastic.out(1,.75)", overwrite: true });
    });
    root.addEventListener("mouseleave", leave);
    return () => { cleanups.forEach((cleanup) => cleanup()); root.removeEventListener("mouseleave", leave); gsap.killTweensOf(cards); };
  }, []);

  return <div ref={arcRef} className="image-arc" aria-label="Image inspiration examples">{imageInspiration.map((image, index) => <div className="image-arc-card" key={image}><Image src={`/HeroImages/${image}`} alt={`AI image example ${index + 1}`} fill sizes="220px" /></div>)}</div>;
}

function PremiumToast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onClose, 4500); return () => window.clearTimeout(timer); }, [onClose, toast.id]);
  const Icon = toast.kind === "success" ? FiCheck : toast.kind === "warning" ? FiAlertTriangle : FiAlertCircle;
  return <aside className={`premium-toast premium-toast--${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}><span><Icon /></span><div><strong>{toast.title}</strong><p>{toast.message}</p></div><button type="button" onClick={onClose} aria-label="Dismiss notification"><FiX /></button><i aria-hidden="true" /></aside>;
}

function GenerationStage({ mode, progress, ratio }: { mode: CreationMode; progress: number; ratio: string }) {
  return <div className="generation-stage"><div className={`generation-stage__frame ratio-${ratio.replace(":", "-")}`}>
    <span className="generation-stage__type">{mode === "video" ? <FiVideo /> : <FiImage />}</span><strong>{progress}%</strong>
    <div className="generation-stage__copy"><span className="generate-spinner" /><b>Creating your {mode}</b><small>{ratio} composition</small></div>
    <div className="generation-stage__track"><i style={{ width: `${progress}%` }} /></div>
  </div></div>;
}

function GeneratedResult({ assetId, mode, notify, ratio, url }: { assetId?: string | null; mode: CreationMode; notify?: (toast: ToastMessage | null) => void; ratio: string; url?: string | null }) {
  const [downloading, setDownloading] = useState(false);
  const source = url ?? (mode === "video" ? dashboardVideo : "/Female_model_posing_in_architecture_20260921034158.jpeg");
  const download = async () => {
    if (!assetId || downloading) return;
    setDownloading(true);
    try {
      const result = await api<{ url: string }>(`/assets/${assetId}/download`);
      const anchor = document.createElement("a"); anchor.href = result.url; anchor.rel = "noopener"; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } catch (error) { notify?.({ id: Date.now(), kind: "error", title: "Download failed", message: error instanceof Error ? error.message : "Please try again in a moment." }); }
    finally { setDownloading(false); }
  };
  return <div className="generated-result generated-result--single"><div className={`generated-result__media ratio-${ratio.replace(":", "-")}`}>
    <button className="generated-result__download" type="button" disabled={!assetId || downloading} onClick={() => void download()} aria-label={`Download generated ${mode}`}><FiDownload />{downloading ? "Preparing…" : "Download"}</button>
    {mode === "video" ? <video src={source} controls autoPlay muted loop playsInline /> : <img src={source} alt="Generated AI result" />}
  </div></div>;
}
function HistoryPanel({ generated, onBack }: { generated: boolean; onBack: () => void }) {
  const [assets, setAssets] = useState<GenerationAsset[]>([]);
  const [filter, setFilter] = useState<"ALL" | "VIDEO" | "IMAGE">("ALL");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const query = filter === "ALL" ? "" : `?mediaType=${filter}`;
    void api<{ items: GenerationAsset[] }>(`/assets${query}`).then((result) => setAssets(result.items)).catch(() => setAssets([])).finally(() => setLoading(false));
  }, [filter, generated]);
  return <div className="history-panel asset-library">
    <div className="asset-library__top"><button type="button" onClick={onBack}><FiArrowLeft />Back</button><div className="asset-library__tabs" aria-label="Filter assets"><button className={filter === "ALL" ? "is-active" : ""} onClick={() => { setLoading(true); setFilter("ALL"); }} type="button"><FiGrid />All</button><button className={filter === "VIDEO" ? "is-active" : ""} onClick={() => { setLoading(true); setFilter("VIDEO"); }} type="button"><FiVideo />Videos</button><button className={filter === "IMAGE" ? "is-active" : ""} onClick={() => { setLoading(true); setFilter("IMAGE"); }} type="button"><FiImage />Images</button></div></div>
    <div className="asset-library__heading"><div><span>Your library</span><h1>Assets</h1><p>Images and videos created in your 8xMotion workspace.</p></div><span>{assets.length} creations</span></div>
    {!loading && assets.length === 0 ? <div className="asset-library__empty"><span>{filter === "VIDEO" ? <FiVideo /> : filter === "IMAGE" ? <FiImage /> : <FiFolder />}</span><h2>{filter === "ALL" ? "No assets yet" : `No ${filter.toLowerCase()} assets yet`}</h2><p>Your generated {filter === "ALL" ? "images and videos" : filter.toLowerCase()} will appear here.</p></div> : <div className="asset-grid">{assets.map((asset) => <article key={asset.id}><div>{asset.mediaType === "VIDEO" ? <video src={asset.previewUrl} muted loop playsInline onMouseEnter={(event) => void event.currentTarget.play()} onMouseLeave={(event) => { event.currentTarget.pause(); event.currentTarget.currentTime = 0; }} /> : <img src={asset.previewUrl} alt={asset.generation?.prompt ?? "Generated image"} />}<span aria-label={asset.mediaType === "VIDEO" ? "Video" : "Image"}>{asset.mediaType === "VIDEO" ? <FiVideo /> : <FiImage />}</span></div><h2>{asset.generation?.prompt ?? "Untitled generation"}</h2><p>Created {new Date(asset.createdAt).toLocaleDateString()}</p></article>)}</div>}
  </div>;
}
