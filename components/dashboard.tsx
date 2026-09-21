"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiAtSign, FiBell, FiCheck, FiChevronRight, FiClock, FiCpu, FiDownload, FiEdit3, FiFastForward, FiFolder, FiGrid, FiHelpCircle, FiImage, FiLayers, FiLogOut, FiMaximize, FiMenu, FiMinus, FiMonitor, FiMusic, FiPlay, FiPlus, FiSettings, FiSliders, FiStar, FiUpload, FiUser, FiVideo, FiVolume2, FiX, FiZap } from "react-icons/fi";
import { LuCrown } from "react-icons/lu";
import gsap from "gsap";

type CreationMode = "video" | "image";
const dashboardVideo = "/dashboard/Explorer_viewing_massive_spacecraft_1080p_20260921052912.mp4";
const imageInspiration = ["hero2.jpeg", "hero5.jpeg", "hero1.jpeg", "hero7.jpeg"];

export function Dashboard() {
  const contentRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<CreationMode>("video");
  const [sourceMode, setSourceMode] = useState<"references" | "extend">("references");
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"guide" | "history">("guide");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [imageCount, setImageCount] = useState(4);

  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!generating) return;
    const timer = window.setTimeout(() => { setGenerating(false); setGenerated(true); }, 2600);
    return () => window.clearTimeout(timer);
  }, [generating]);
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(contentRef.current, { x: 22, autoAlpha: 0, filter: "blur(6px)" }, { x: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.58, ease: "power3.out" });
  }, [mode, workspaceTab]);

  const changeMode = (nextMode: CreationMode) => { setMode(nextMode); setGenerated(false); setMobilePanelOpen(false); };
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file)); setGenerated(false);
  };
  const startGeneration = () => { setGenerating(true); setGenerated(false); };

  return (
    <main className={`dashboard-shell dashboard-shell--${mode}`}>
      <DashboardHeader mode={mode} onModeChange={changeMode} profileOpen={profileOpen} setProfileOpen={setProfileOpen} mobilePanelOpen={mobilePanelOpen} setMobilePanelOpen={setMobilePanelOpen} onOpenAssets={() => setWorkspaceTab((current) => current === "history" ? "guide" : "history")} />
      {mode === "video" ? (
        <div className="dashboard-body dashboard-body--video">
          <VideoSidebar fileInputRef={fileInputRef} generating={generating} onFile={onFile} onGenerate={startGeneration} open={mobilePanelOpen} preview={preview} prompt={prompt} setPrompt={setPrompt} setSourceMode={setSourceMode} sourceMode={sourceMode} />
          {mobilePanelOpen && <button className="dashboard-backdrop" aria-label="Close controls" onClick={() => setMobilePanelOpen(false)} type="button" />}
          <section ref={contentRef} className="dashboard-workspace dashboard-workspace--video">
            {workspaceTab === "history" ? <HistoryPanel generated={generated} mode="video" /> : <VideoWorkspace generated={generated} />}
          </section>
        </div>
      ) : (
        <section ref={contentRef} className="image-dashboard">
          {workspaceTab === "history" ? <HistoryPanel generated={generated} mode="image" /> : generated ? <GeneratedResult mode="image" /> : <ImageCreationCanvas count={imageCount} generating={generating} onGenerate={startGeneration} prompt={prompt} setCount={setImageCount} setPrompt={setPrompt} />}
        </section>
      )}
    </main>
  );
}

type HeaderProps = { mode: CreationMode; onModeChange: (mode: CreationMode) => void; profileOpen: boolean; setProfileOpen: (open: boolean) => void; mobilePanelOpen: boolean; setMobilePanelOpen: (open: boolean) => void; onOpenAssets: () => void };
function DashboardHeader({ mode, onModeChange, profileOpen, setProfileOpen, mobilePanelOpen, setMobilePanelOpen, onOpenAssets }: HeaderProps) {
  return <header className="dashboard-header">
    <Link className="dashboard-brand" href="/" aria-label="8xMotion home"><Image src="/BLogo.png" alt="8xMotion" width={1774} height={887} priority /></Link>
    <nav className="dashboard-primary-nav" data-mode={mode} aria-label="Creation mode"><span className="dashboard-primary-nav__indicator" aria-hidden="true" /><button className={mode === "video" ? "is-active" : ""} onClick={() => onModeChange("video")} type="button"><FiVideo /><span>Video</span></button><button className={mode === "image" ? "is-active" : ""} onClick={() => onModeChange("image")} type="button"><FiImage /><span>Image</span></button></nav>
    <div className="dashboard-account"><button className="dashboard-assets-button" type="button" onClick={onOpenAssets}><FiFolder aria-hidden="true" /><span>Assets</span></button><button className="dashboard-icon-button" type="button" aria-label="Notifications"><FiBell aria-hidden="true" /></button><div className="profile-menu"><button className="profile-trigger" type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} aria-label="Open profile"><span>AM</span></button>{profileOpen && <div className="profile-dropdown profile-dropdown--account"><div className="profile-summary"><span className="profile-summary__avatar">AM</span><div><strong>Alex Morgan</strong><span>Free plan</span></div></div><div className="profile-credit-card"><div className="profile-credit-card__title"><span>Credits <FiHelpCircle /></span><button type="button">1,240 left <FiChevronRight /></button></div><div className="profile-credit-dots" aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} />)}</div><div className="profile-upgrade"><span><LuCrown />Go Premium</span><button type="button">Upgrade</button></div></div><div className="profile-actions"><button type="button"><FiUser />Manage profile</button><button type="button"><FiSettings />Settings</button><Link href="/"><FiLogOut />Log out</Link></div></div>}</div>{mode === "video" && <button className="dashboard-mobile-toggle" type="button" onClick={() => setMobilePanelOpen(!mobilePanelOpen)} aria-label="Toggle controls">{mobilePanelOpen ? <FiX /> : <FiMenu />}</button>}</div>
  </header>;
}

type VideoSidebarProps = { fileInputRef: React.RefObject<HTMLInputElement | null>; generating: boolean; onFile: (event: ChangeEvent<HTMLInputElement>) => void; onGenerate: () => void; open: boolean; preview: string | null; prompt: string; setPrompt: (prompt: string) => void; setSourceMode: (mode: "references" | "extend") => void; sourceMode: "references" | "extend" };
function VideoSidebar({ fileInputRef, generating, onFile, onGenerate, open, preview, prompt, setPrompt, setSourceMode, sourceMode }: VideoSidebarProps) {
  const [openFilter, setOpenFilter] = useState<"model" | "duration" | "ratio" | "quality" | null>(null);
  const [model, setModel] = useState("Seedance 2.5");
  const [duration, setDuration] = useState(12);
  const [ratio, setRatio] = useState("16:9");
  const [quality, setQuality] = useState("1080p");
  const models = [
    { name: "Seedance 2.5", meta: "1080p · 4s–30s", Icon: FiVideo },
    { name: "8xMotion Genjutsu", meta: "1080p · 4s–30s", Icon: FiZap },
    { name: "Seedance 2.5 Edit", meta: "480p–720p · Edit video", Icon: FiEdit3 },
    { name: "Seedance 2.0", meta: "4K · 4s–15s", Icon: FiLayers },
    { name: "Seedance 2.0 Fast", meta: "720p · 4s–15s", Icon: FiFastForward },
  ];
  return <aside className={`creation-sidebar premium-sidebar${open ? " is-open" : ""}`}>
    <div className="premium-sidebar__scroll">
      <article className="model-preview-card"><video src={dashboardVideo} autoPlay muted loop playsInline preload="metadata" /><div className="model-preview-card__shade" /><div><strong>GENERAL</strong><span>Seedance 2.5</span></div></article>
      <div className="source-switch"><button className={sourceMode === "references" ? "is-active" : ""} onClick={() => setSourceMode("references")} type="button">References</button><button className={sourceMode === "extend" ? "is-active" : ""} onClick={() => setSourceMode("extend")} type="button">Extend Video</button></div>
      <button className={`reference-drop${preview ? " has-preview" : ""}`} type="button" onClick={() => fileInputRef.current?.click()}>{preview ? (sourceMode === "extend" ? <video src={preview} muted /> : <Image src={preview} alt="Uploaded reference" fill unoptimized />) : <><div><span><FiImage /></span><span><FiVideo /></span><span><FiMusic /></span></div><strong>Add references</strong><small>{sourceMode === "extend" ? "Upload the video you want to extend" : "Image, Video or Audio"}</small></>}</button>
      <input ref={fileInputRef} hidden type="file" accept={sourceMode === "extend" ? "video/*" : "image/*"} onChange={onFile} />
      <section className="premium-prompt"><label htmlFor="video-prompt">Prompt <span>{prompt.length}/500</span></label><textarea id="video-prompt" maxLength={500} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the motion, camera, mood, and atmosphere…" /><div><button type="button"><FiAtSign />Elements</button><button type="button"><FiVolume2 />On</button></div></section>
      <div className="video-filter-wrap">
        <button className="model-selector" type="button" onClick={() => setOpenFilter(openFilter === "model" ? null : "model")}><span><small>Model</small><strong>{model} <i><b /><b /><b /></i></strong></span><FiChevronRight /></button>
        {openFilter === "model" && <div className="video-model-menu"><label><FiSliders /><input autoFocus placeholder="Search models…" /></label><small>Featured models</small>{models.map((item) => <button className={model === item.name ? "is-active" : ""} key={item.name} type="button" onClick={() => { setModel(item.name); setOpenFilter(null); }}><span className="video-model-menu__icon"><item.Icon /></span><span><strong>{item.name}</strong><small>{item.meta}</small></span>{model === item.name && <FiCheck />}</button>)}</div>}
      </div>
      <div className="premium-settings">
        <div className="video-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "duration" ? null : "duration")}><FiClock /><span>{duration}s</span></button>{openFilter === "duration" && <div className="video-filter-menu video-duration-menu"><strong>Choose duration</strong><output>{duration}s</output><input aria-label="Video duration" type="range" min="4" max="30" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></div>}</div>
        <div className="video-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "ratio" ? null : "ratio")}><FiMaximize /><span>{ratio}</span></button>{openFilter === "ratio" && <div className="video-filter-menu">{["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"].map((item) => <button className={ratio === item ? "is-active" : ""} key={item} type="button" onClick={() => { setRatio(item); setOpenFilter(null); }}><span>{item}</span>{ratio === item && <FiCheck />}</button>)}</div>}</div>
        <div className="video-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "quality" ? null : "quality")}><FiGrid /><span>{quality}</span></button>{openFilter === "quality" && <div className="video-filter-menu">{["480p", "720p", "1080p"].map((item) => <button className={quality === item ? "is-active" : ""} key={item} type="button" onClick={() => { setQuality(item); setOpenFilter(null); }}><span>{item}</span>{quality === item && <FiCheck />}</button>)}</div>}</div>
      </div>
    </div>
    <button className="premium-generate" type="button" disabled={generating} onClick={onGenerate}>{generating ? <><span className="generate-spinner" />Generating…</> : <>Generate <FiZap /><del>80</del><strong>60</strong></>}</button>
  </aside>;
}

function VideoWorkspace({ generated }: { generated: boolean }) {
  const createSteps = [{ image: "hero2.jpeg", title: "Add image", copy: "Upload or choose an image to begin your animation.", Icon: FiUpload }, { image: "hero5.jpeg", title: "Choose preset", copy: "Pick a motion style to guide camera and subject movement.", Icon: FiSliders }, { image: "hero7.jpeg", title: "Get video", copy: "Generate your final cinematic clip and download it.", Icon: FiPlay }];
  if (generated) return <GeneratedResult mode="video" />;
  return <div className="workspace-guide"><div className="workspace-heading"><span>Image to video</span><h1>Make videos in one click</h1><p>Upload an image, choose a movement preset, and turn a still moment into a cinematic story.</p></div><div className="guide-steps guide-steps--arc">{createSteps.map(({ image, title, copy, Icon }, index) => <article key={title}><GuideVisual image={image} index={index} Icon={Icon} /><h2>{title}</h2><p>{copy}</p></article>)}</div></div>;
}

function GuideVisual({ image, index, Icon }: { image: string; index: number; Icon: React.ComponentType }) {
  if (index === 0) return <div className="guide-demo guide-demo--upload"><div className="guide-upload-placeholder"><FiImage /><strong>Upload image</strong><small>or paste from clipboard</small></div><div className="guide-floating-image"><Image src={`/HeroImages/${image}`} alt="Image upload example" fill sizes="28vw" /></div><Icon /></div>;
  if (index === 1) return <div className="guide-demo guide-demo--presets"><div className="guide-preset-card"><Image src="/HeroImages/hero4.jpeg" alt="Preset example" fill sizes="10vw" /></div><div className="guide-preset-card is-active"><Image src={`/HeroImages/${image}`} alt="Selected preset example" fill sizes="10vw" /></div><div className="guide-preset-card"><Image src="/HeroImages/hero6.jpeg" alt="Preset example" fill sizes="10vw" /></div><Icon /></div>;
  return <div className="guide-demo guide-demo--result"><video src={dashboardVideo} autoPlay muted loop playsInline /><div className="guide-result-frame" /><Icon /></div>;
}

type ImageCanvasProps = { count: number; generating: boolean; onGenerate: () => void; prompt: string; setCount: (count: number) => void; setPrompt: (prompt: string) => void };
function ImageCreationCanvas({ count, generating, onGenerate, prompt, setCount, setPrompt }: ImageCanvasProps) {
  const [openFilter, setOpenFilter] = useState<"model" | "ratio" | "quality" | "resolution" | null>(null);
  const [model, setModel] = useState("GPT Image 2");
  const [ratio, setRatio] = useState("Auto");
  const [quality, setQuality] = useState("High");
  const [resolution, setResolution] = useState("2K");
  const models = [
    { name: "8xMotion Soul 2.0", copy: "Next-generation ultra-realistic fashion visuals", Icon: FiZap },
    { name: "8xMotion Soul Cinema", copy: "Cinema-grade visual creation", Icon: FiVideo },
    { name: "GPT Image 2.5 Sunburst", copy: "Exceptional quality, precise edits", Icon: FiStar },
    { name: "GPT Image 2.5 Flare", copy: "Stunning everyday images, fast", Icon: FiZap },
    { name: "GPT Image 2", copy: "4K images with near-perfect text rendering", Icon: FiCpu },
    { name: "Seedream 5.0 Pro", copy: "Logically consistent images with visual reasoning", Icon: FiLayers },
  ];
  return <div className="image-creation-canvas"><div className="image-creation-hero"><AnimatedImageArc /><h1>Start creating with<br /><span>8xMotion Soul Cinema</span></h1><p>Describe a scene, character, mood, or style — and watch it come to life.</p></div><div className="image-composer"><div className="image-composer__input"><button type="button" aria-label="Add reference"><FiPlus /></button><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the scene you imagine" rows={1} /></div><div className="image-composer__bottom"><div className="image-composer__options">
    <div className="image-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "model" ? null : "model")}><FiCpu />{model}<FiChevronRight /></button>{openFilter === "model" && <div className="image-model-menu"><label><FiSliders /><input autoFocus placeholder="Search models…" /></label><small>Featured models</small>{models.map((item) => <button className={model === item.name ? "is-active" : ""} key={item.name} type="button" onClick={() => { setModel(item.name); setOpenFilter(null); }}><span><item.Icon /></span><span><strong>{item.name}</strong><small>{item.copy}</small></span>{model === item.name && <FiCheck />}</button>)}</div>}</div>
    <div className="image-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "ratio" ? null : "ratio")}><FiMaximize />{ratio}</button>{openFilter === "ratio" && <ImageOptionMenu title="Aspect ratio" value={ratio} options={["Auto", "1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4", "21:9"]} onSelect={(value) => { setRatio(value); setOpenFilter(null); }} />}</div>
    <div className="image-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "quality" ? null : "quality")}><FiStar />{quality}</button>{openFilter === "quality" && <ImageOptionMenu title="Select quality" value={quality} options={["Low", "Medium", "High"]} descriptions={{ Low: "Fastest and cheapest", Medium: "Balanced visuals", High: "Best visual fidelity" }} onSelect={(value) => { setQuality(value); setOpenFilter(null); }} />}</div>
    <div className="image-filter-wrap"><button type="button" onClick={() => setOpenFilter(openFilter === "resolution" ? null : "resolution")}><FiMonitor />{resolution}</button>{openFilter === "resolution" && <ImageOptionMenu title="Select resolution" value={resolution} options={["1K", "2K", "4K"]} descriptions={{ "1K": "1024px", "2K": "2048px", "4K": "4096px" }} onSelect={(value) => { setResolution(value); setOpenFilter(null); }} />}</div>
    <div className="count-stepper"><button type="button" aria-label="Decrease count" onClick={() => setCount(Math.max(1, count - 1))}><FiMinus /></button><span>{count}/4</span><button type="button" aria-label="Increase count" onClick={() => setCount(Math.min(4, count + 1))}><FiPlus /></button></div></div><button className="image-generate" type="button" disabled={generating} onClick={onGenerate}>{generating ? "Creating…" : <>Generate <FiZap /><del>8.5</del><strong>6.5</strong></>}</button></div></div></div>;
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

function GeneratedResult({ mode }: { mode: CreationMode }) { return <div className="generated-result"><div className="generated-result__media">{mode === "video" ? <video src={dashboardVideo} autoPlay muted loop playsInline /> : <Image src="/Female_model_posing_in_architecture_20260921034158.jpeg" alt="Generated AI result" fill sizes="70vw" />}</div><div><span><FiCheck />Generation complete</span><h1>Your {mode} is ready</h1><p>This frontend preview simulates the completed generation state.</p><button type="button"><FiDownload />Download</button></div></div>; }
function HistoryPanel({ generated, mode }: { generated: boolean; mode: CreationMode }) {
  const assets = [
    { type: "image" as const, src: "/HeroImages/hero2.jpeg", title: "Neon portrait" },
    { type: "video" as const, src: dashboardVideo, title: "Space explorer" },
    { type: "image" as const, src: "/HeroImages/hero5.jpeg", title: "Editorial motion" },
    { type: "image" as const, src: "/HeroImages/hero7.jpeg", title: "Night campaign" },
    { type: "video" as const, src: "/Circular_Slider/Woman_walking_on_skyscraper_rooftop_20260921005546.mp4", title: "Rooftop film" },
    { type: "image" as const, src: "/HeroImages/hero1.jpeg", title: "Cinematic world" },
  ];
  return <div className="history-panel asset-library"><div className="asset-library__heading"><div><span>Your library</span><h1>Assets</h1><p>Images and videos created in your 8xMotion workspace.</p></div><span>{assets.length + (generated ? 1 : 0)} creations</span></div><div className="asset-grid">{assets.map((asset) => <article key={asset.title}><div>{asset.type === "video" ? <video src={asset.src} muted loop playsInline onMouseEnter={(event) => void event.currentTarget.play()} onMouseLeave={(event) => { event.currentTarget.pause(); event.currentTarget.currentTime = 0; }} /> : <Image src={asset.src} alt={asset.title} fill sizes="(max-width: 700px) 50vw, 24vw" />}<span>{asset.type === "video" ? <FiVideo /> : <FiImage />}{asset.type}</span></div><h2>{asset.title}</h2><p>{mode === "video" ? "Generated video project" : "Generated image project"}</p></article>)}</div></div>;
}
