"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiAtSign, FiBell, FiCheck, FiChevronDown, FiChevronRight, FiClock, FiDownload, FiEdit3, FiFolder, FiGrid, FiHelpCircle, FiImage, FiLogOut, FiMaximize, FiMenu, FiMinus, FiMusic, FiPlay, FiPlus, FiSettings, FiSliders, FiUpload, FiUser, FiVideo, FiVolume2, FiX, FiZap } from "react-icons/fi";
import gsap from "gsap";

type CreationMode = "video" | "image";
type VideoFlow = "create" | "edit" | "motion";
const dashboardVideo = "/dashboard/Explorer_viewing_massive_spacecraft_1080p_20260921052912.mp4";
const videoPresets = ["General", "Cinematic push", "Orbit", "Handheld", "Slow motion", "Product reveal"];
const imageInspiration = ["hero2.jpeg", "hero5.jpeg", "hero1.jpeg", "hero7.jpeg"];

export function Dashboard() {
  const contentRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<CreationMode>("video");
  const [videoFlow, setVideoFlow] = useState<VideoFlow>("create");
  const [sourceMode, setSourceMode] = useState<"references" | "extend">("references");
  const [selectedPreset, setSelectedPreset] = useState("General");
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
  }, [mode, videoFlow, workspaceTab]);

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
      <DashboardHeader mode={mode} onModeChange={changeMode} profileOpen={profileOpen} setProfileOpen={setProfileOpen} mobilePanelOpen={mobilePanelOpen} setMobilePanelOpen={setMobilePanelOpen} />
      {mode === "video" ? (
        <div className="dashboard-body dashboard-body--video">
          <VideoSidebar fileInputRef={fileInputRef} flow={videoFlow} generating={generating} onFile={onFile} onGenerate={startGeneration} onFlowChange={setVideoFlow} open={mobilePanelOpen} preview={preview} prompt={prompt} selectedPreset={selectedPreset} setPrompt={setPrompt} setSelectedPreset={setSelectedPreset} setSourceMode={setSourceMode} sourceMode={sourceMode} />
          {mobilePanelOpen && <button className="dashboard-backdrop" aria-label="Close controls" onClick={() => setMobilePanelOpen(false)} type="button" />}
          <section ref={contentRef} className="dashboard-workspace dashboard-workspace--video">
            <WorkspaceToolbar mode="video" tab={workspaceTab} setTab={setWorkspaceTab} label={`${videoFlow === "edit" ? "Edit" : videoFlow === "motion" ? "Motion control" : "Create"} video`} />
            {workspaceTab === "history" ? <HistoryPanel generated={generated} mode="video" /> : <VideoWorkspace flow={videoFlow} generated={generated} />}
          </section>
        </div>
      ) : (
        <section ref={contentRef} className="image-dashboard">
          <WorkspaceToolbar mode="image" tab={workspaceTab} setTab={setWorkspaceTab} label="Create image" />
          {workspaceTab === "history" ? <HistoryPanel generated={generated} mode="image" /> : generated ? <GeneratedResult mode="image" /> : <ImageCreationCanvas count={imageCount} generating={generating} onGenerate={startGeneration} prompt={prompt} setCount={setImageCount} setPrompt={setPrompt} />}
        </section>
      )}
    </main>
  );
}

type HeaderProps = { mode: CreationMode; onModeChange: (mode: CreationMode) => void; profileOpen: boolean; setProfileOpen: (open: boolean) => void; mobilePanelOpen: boolean; setMobilePanelOpen: (open: boolean) => void };
function DashboardHeader({ mode, onModeChange, profileOpen, setProfileOpen, mobilePanelOpen, setMobilePanelOpen }: HeaderProps) {
  return <header className="dashboard-header">
    <Link className="dashboard-brand" href="/" aria-label="8xMotion home"><Image src="/BLogo.png" alt="8xMotion" width={1774} height={887} priority /></Link>
    <nav className="dashboard-primary-nav" aria-label="Creation mode"><button className={mode === "video" ? "is-active" : ""} onClick={() => onModeChange("video")} type="button"><FiVideo />Video</button><button className={mode === "image" ? "is-active" : ""} onClick={() => onModeChange("image")} type="button"><FiImage />Image</button></nav>
    <div className="dashboard-account"><div className="credit-chip"><FiZap /><span>1,240 credits</span></div><button className="dashboard-icon-button" type="button" aria-label="Notifications"><FiBell /></button><div className="profile-menu"><button className="profile-trigger" type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}><span>AM</span><FiChevronDown /></button>{profileOpen && <div className="profile-dropdown"><div><strong>Alex Morgan</strong><span>alex@example.com</span></div><button type="button"><FiUser />Manage profile</button><button type="button"><FiSettings />Settings</button><Link href="/"><FiLogOut />Log out</Link></div>}</div>{mode === "video" && <button className="dashboard-mobile-toggle" type="button" onClick={() => setMobilePanelOpen(!mobilePanelOpen)} aria-label="Toggle controls">{mobilePanelOpen ? <FiX /> : <FiMenu />}</button>}</div>
  </header>;
}

type VideoSidebarProps = { fileInputRef: React.RefObject<HTMLInputElement | null>; flow: VideoFlow; generating: boolean; onFile: (event: ChangeEvent<HTMLInputElement>) => void; onGenerate: () => void; onFlowChange: (flow: VideoFlow) => void; open: boolean; preview: string | null; prompt: string; selectedPreset: string; setPrompt: (prompt: string) => void; setSelectedPreset: (preset: string) => void; setSourceMode: (mode: "references" | "extend") => void; sourceMode: "references" | "extend" };
function VideoSidebar({ fileInputRef, flow, generating, onFile, onGenerate, onFlowChange, open, preview, prompt, selectedPreset, setPrompt, setSelectedPreset, setSourceMode, sourceMode }: VideoSidebarProps) {
  return <aside className={`creation-sidebar premium-sidebar${open ? " is-open" : ""}`}>
    <div className="premium-sidebar__scroll">
      <div className="premium-tabs"><button className={flow === "create" ? "is-active" : ""} onClick={() => onFlowChange("create")} type="button">Create Video</button><button className={flow === "edit" ? "is-active" : ""} onClick={() => onFlowChange("edit")} type="button">Edit Video</button><button className={flow === "motion" ? "is-active" : ""} onClick={() => onFlowChange("motion")} type="button">Motion Control</button></div>
      <article className="model-preview-card"><video src={dashboardVideo} autoPlay muted loop playsInline preload="metadata" /><div className="model-preview-card__shade" /><button type="button"><FiEdit3 />Change</button><div><strong>{flow === "motion" ? "MOTION" : flow === "edit" ? "EDIT" : "GENERAL"}</strong><span>Seedance 2.5</span></div></article>
      <div className="source-switch"><button className={sourceMode === "references" ? "is-active" : ""} onClick={() => setSourceMode("references")} type="button">References</button><button className={sourceMode === "extend" ? "is-active" : ""} onClick={() => setSourceMode("extend")} type="button">Extend Video</button></div>
      <button className={`reference-drop${preview ? " has-preview" : ""}`} type="button" onClick={() => fileInputRef.current?.click()}>{preview ? (flow === "edit" || sourceMode === "extend" ? <video src={preview} muted /> : <Image src={preview} alt="Uploaded reference" fill unoptimized />) : <><div><span><FiImage /></span><span><FiVideo /></span><span><FiMusic /></span></div><strong>Add references</strong><small>{sourceMode === "extend" ? "Upload the video you want to extend" : "Image, Video or Audio"}</small></>}</button>
      <input ref={fileInputRef} hidden type="file" accept={flow === "edit" || sourceMode === "extend" ? "video/*" : "image/*,video/*,audio/*"} onChange={onFile} />
      <section className="premium-prompt"><label htmlFor="video-prompt">Prompt <span>{prompt.length}/500</span></label><textarea id="video-prompt" maxLength={500} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={flow === "edit" ? "Describe the visual change you want — e.g., make it snow…" : "Describe the motion, camera, mood, and atmosphere…"} /><div><button type="button"><FiAtSign />Elements</button><button type="button"><FiVolume2 />On</button></div></section>
      <button className="model-selector" type="button"><span><small>Model</small><strong>Seedance 2.5 <i><b /><b /><b /></i></strong></span><FiChevronRight /></button>
      <section className="preset-drawer"><div><span>Motion preset</span><small>{selectedPreset}</small></div><div className="preset-grid premium-preset-grid">{videoPresets.map((preset) => <button className={selectedPreset === preset ? "is-active" : ""} onClick={() => setSelectedPreset(preset)} type="button" key={preset}>{preset}</button>)}</div></section>
      <div className="premium-settings"><button type="button"><FiClock /><span>5s</span></button><button type="button"><FiMaximize /><span>16:9</span></button><button type="button"><FiGrid /><span>1080p</span></button></div>
    </div>
    <button className="premium-generate" type="button" disabled={generating} onClick={onGenerate}>{generating ? <><span className="generate-spinner" />Generating…</> : <>Generate <FiZap /><del>80</del><strong>60</strong></>}</button>
  </aside>;
}

function WorkspaceToolbar({ mode, tab, setTab, label }: { mode: CreationMode; tab: "guide" | "history"; setTab: (tab: "guide" | "history") => void; label: string }) {
  return <div className="workspace-toolbar"><div><button className={tab === "history" ? "is-active" : ""} onClick={() => setTab("history")} type="button"><FiFolder />History</button><button className={tab === "guide" ? "is-active" : ""} onClick={() => setTab("guide")} type="button"><FiHelpCircle />How it works</button></div><span>{mode === "image" ? "Image studio" : label}</span></div>;
}

function VideoWorkspace({ flow, generated }: { flow: VideoFlow; generated: boolean }) {
  const createSteps = [{ image: "hero2.jpeg", title: "Add image", copy: "Upload or choose an image to begin your animation.", Icon: FiUpload }, { image: "hero5.jpeg", title: "Choose preset", copy: "Pick a motion style to guide camera and subject movement.", Icon: FiSliders }, { image: "hero7.jpeg", title: "Get video", copy: "Generate your final cinematic clip and download it.", Icon: FiPlay }];
  const editSteps = [{ image: "hero4.jpeg", title: "Add video", copy: "Upload the clip you want to transform or extend.", Icon: FiVideo }, { image: "hero6.jpeg", title: "Describe edit", copy: "Explain the visual change, mood, or new environment.", Icon: FiEdit3 }, { image: "hero3.jpeg", title: "Export result", copy: "Review your transformed video and export in HD.", Icon: FiDownload }];
  const motionSteps = [{ image: "hero1.jpeg", title: "Choose subject", copy: "Add a character or product as your motion subject.", Icon: FiUser }, { image: "hero3.jpeg", title: "Direct motion", copy: "Select camera movement and performance intensity.", Icon: FiSliders }, { image: "hero6.jpeg", title: "Render movement", copy: "Generate smooth, directed motion in one click.", Icon: FiPlay }];
  const steps = flow === "create" ? createSteps : flow === "edit" ? editSteps : motionSteps;
  if (generated) return <GeneratedResult mode="video" />;
  return <div className="workspace-guide"><div className="workspace-heading"><span>{flow === "create" ? "Image to video" : flow === "edit" ? "AI video editor" : "Motion director"}</span><h1>{flow === "create" ? "Make videos in one click" : flow === "edit" ? "Transform every frame" : "Control every movement"}</h1><p>{flow === "create" ? "Upload an image, choose a movement preset, and turn a still moment into a cinematic story." : flow === "edit" ? "Upload footage and describe the change—8xMotion handles the transformation." : "Direct characters, camera, and timing with purpose-built AI motion controls."}</p></div><div className="guide-steps">{steps.map(({ image, title, copy, Icon }, index) => <article key={title}><div><Image src={`/HeroImages/${image}`} alt="" fill sizes="28vw" /><span>{index + 1}</span><Icon /></div><h2>{title}</h2><p>{copy}</p></article>)}</div></div>;
}

type ImageCanvasProps = { count: number; generating: boolean; onGenerate: () => void; prompt: string; setCount: (count: number) => void; setPrompt: (prompt: string) => void };
function ImageCreationCanvas({ count, generating, onGenerate, prompt, setCount, setPrompt }: ImageCanvasProps) {
  return <div className="image-creation-canvas"><div className="image-creation-hero"><div className="image-sample-stack">{imageInspiration.map((image, index) => <div key={image} style={{ "--sample-index": index } as React.CSSProperties}><Image src={`/HeroImages/${image}`} alt="AI image example" fill sizes="180px" /></div>)}</div><h1>Start creating with<br /><span>8xMotion Soul Cinema</span></h1><p>Describe a scene, character, mood, or style — and watch it come to life.</p></div><div className="image-composer"><div className="image-composer__input"><button type="button" aria-label="Add reference"><FiPlus /></button><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the scene you imagine" rows={1} /></div><div className="image-composer__bottom"><div className="image-composer__options"><button type="button"><FiZap />Soul Image 2 <FiChevronRight /></button><button type="button"><FiMaximize />Auto</button><button type="button"><FiZap />High</button><button type="button"><FiGrid />2K</button><button type="button"><FiSliders />Auto</button><div className="count-stepper"><button type="button" aria-label="Decrease count" onClick={() => setCount(Math.max(1, count - 1))}><FiMinus /></button><span>{count}/4</span><button type="button" aria-label="Increase count" onClick={() => setCount(Math.min(4, count + 1))}><FiPlus /></button></div></div><button className="image-generate" type="button" disabled={generating} onClick={onGenerate}>{generating ? "Creating…" : <>Generate <FiZap /><del>8.5</del><strong>6.5</strong></>}</button></div></div></div>;
}

function GeneratedResult({ mode }: { mode: CreationMode }) { return <div className="generated-result"><div className="generated-result__media">{mode === "video" ? <video src={dashboardVideo} autoPlay muted loop playsInline /> : <Image src="/Female_model_posing_in_architecture_20260921034158.jpeg" alt="Generated AI result" fill sizes="70vw" />}</div><div><span><FiCheck />Generation complete</span><h1>Your {mode} is ready</h1><p>This frontend preview simulates the completed generation state.</p><button type="button"><FiDownload />Download</button></div></div>; }
function HistoryPanel({ generated, mode }: { generated: boolean; mode: CreationMode }) { return <div className="history-panel"><div className="workspace-heading"><span>Your library</span><h1>Generation history</h1><p>Recent creations will appear here when backend persistence is connected.</p></div>{generated ? <GeneratedResult mode={mode} /> : <div className="history-empty"><FiClock /><h2>No generations yet</h2><p>Create your first {mode} to start building your history.</p></div>}</div>; }
