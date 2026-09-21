"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FiBell,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFolder,
  FiGrid,
  FiHelpCircle,
  FiImage,
  FiLogOut,
  FiMenu,
  FiPlay,
  FiSettings,
  FiSliders,
  FiUpload,
  FiUser,
  FiVideo,
  FiX,
  FiZap,
} from "react-icons/fi";
import gsap from "gsap";
import CardFanCarousel, { type CardItem } from "@/components/ui/card-fan-carousel";

type CreationMode = "video" | "image";
type VideoFlow = "create" | "edit";

const inspirationCards: CardItem[] = [
  { imgUrl: "/HeroImages/hero1.jpeg", alt: "Cinematic portrait" },
  { imgUrl: "/HeroImages/hero2.jpeg", alt: "Editorial scene" },
  { imgUrl: "/HeroImages/hero3.jpeg", alt: "Creative visual" },
  { imgUrl: "/HeroImages/hero4.jpeg", alt: "Atmospheric landscape" },
  { imgUrl: "/HeroImages/hero5.jpeg", alt: "Stylized character" },
  { imgUrl: "/HeroImages/hero6.jpeg", alt: "Film still" },
  { imgUrl: "/HeroImages/hero7.jpeg", alt: "AI artwork" },
];

const videoPresets = ["General", "Cinematic push", "Orbit", "Handheld", "Slow motion", "Product reveal"];
const imagePresets = ["Editorial", "Photoreal", "Film grain", "3D render", "Anime", "Product studio"];

export function Dashboard() {
  const contentRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<CreationMode>("video");
  const [videoFlow, setVideoFlow] = useState<VideoFlow>("create");
  const [selectedPreset, setSelectedPreset] = useState("General");
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"guide" | "history">("guide");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!generating) return;
    const timer = window.setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [generating]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    gsap.fromTo(
      content,
      { x: 24, autoAlpha: 0, filter: "blur(6px)" },
      { x: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.55, ease: "power3.out" },
    );
  }, [mode, videoFlow, workspaceTab]);

  const changeMode = (nextMode: CreationMode) => {
    setMode(nextMode);
    setSelectedPreset(nextMode === "video" ? "General" : "Editorial");
    setGenerated(false);
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setGenerated(false);
  };

  const presets = mode === "video" ? videoPresets : imagePresets;
  const cost = mode === "video" ? 60 : 20;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="dashboard-brand" href="/" aria-label="8xMotion home">
          <Image src="/BLogo.png" alt="8xMotion" width={1774} height={887} priority />
        </Link>

        <nav className="dashboard-primary-nav" aria-label="Creation mode">
          <button className={mode === "video" ? "is-active" : ""} onClick={() => changeMode("video")} type="button"><FiVideo />Video</button>
          <button className={mode === "image" ? "is-active" : ""} onClick={() => changeMode("image")} type="button"><FiImage />Image</button>
        </nav>

        <div className="dashboard-account">
          <div className="credit-chip"><FiZap /><span>1,240 credits</span></div>
          <button className="dashboard-icon-button" type="button" aria-label="Notifications"><FiBell /></button>
          <div className="profile-menu">
            <button className="profile-trigger" type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen((current) => !current)}>
              <span>AM</span><FiChevronDown />
            </button>
            {profileOpen && (
              <div className="profile-dropdown">
                <div><strong>Alex Morgan</strong><span>alex@example.com</span></div>
                <button type="button"><FiUser />Manage profile</button>
                <button type="button"><FiSettings />Settings</button>
                <Link href="/"><FiLogOut />Log out</Link>
              </div>
            )}
          </div>
          <button className="dashboard-mobile-toggle" type="button" onClick={() => setMobilePanelOpen((open) => !open)} aria-label="Toggle controls">
            {mobilePanelOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className={`creation-sidebar${mobilePanelOpen ? " is-open" : ""}`}>
          {mode === "video" ? (
            <div className="sidebar-tabs">
              <button className={videoFlow === "create" ? "is-active" : ""} onClick={() => setVideoFlow("create")} type="button">Create video</button>
              <button className={videoFlow === "edit" ? "is-active" : ""} onClick={() => setVideoFlow("edit")} type="button">Edit video</button>
            </div>
          ) : (
            <div className="sidebar-title"><FiImage /><span>Create image</span></div>
          )}

          <section className="control-group">
            <div className="control-heading"><span>{videoFlow === "edit" && mode === "video" ? "Source video" : "Reference"}</span><small>Optional</small></div>
            <button className={`upload-control${preview ? " has-preview" : ""}`} type="button" onClick={() => fileInputRef.current?.click()}>
              {preview ? (
                mode === "video" && videoFlow === "edit" ? <video src={preview} muted /> : <Image src={preview} alt="Uploaded reference" fill unoptimized />
              ) : (
                <><FiUpload /><strong>{videoFlow === "edit" && mode === "video" ? "Upload a video" : "Upload an image"}</strong><span>PNG, JPG or MP4 up to 50MB</span></>
              )}
            </button>
            <input ref={fileInputRef} hidden type="file" accept={mode === "video" && videoFlow === "edit" ? "video/*" : "image/*"} onChange={onFile} />
          </section>

          <section className="control-group">
            <label className="control-heading" htmlFor="generation-prompt"><span>Prompt</span><small>{prompt.length}/500</small></label>
            <textarea
              id="generation-prompt"
              maxLength={500}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={mode === "image" ? "Describe the image you want to create…" : videoFlow === "edit" ? "Describe how you want to transform the clip…" : "Describe the motion, camera, and atmosphere…"}
              value={prompt}
            />
          </section>

          <section className="control-group">
            <div className="control-heading"><span>{mode === "video" ? "Motion preset" : "Visual style"}</span><small>{selectedPreset}</small></div>
            <div className="preset-grid">
              {presets.map((preset) => (
                <button className={selectedPreset === preset ? "is-active" : ""} onClick={() => setSelectedPreset(preset)} type="button" key={preset}>{preset}</button>
              ))}
            </div>
          </section>

          <section className="control-group compact-controls">
            {mode === "video" && <button type="button"><FiClock /><span>5 seconds</span></button>}
            <button type="button"><FiGrid /><span>16:9</span></button>
            <button type="button"><FiSliders /><span>{mode === "video" ? "1080p" : "2K"}</span></button>
          </section>

          <button className="generate-button" type="button" disabled={generating} onClick={() => { setGenerating(true); setGenerated(false); }}>
            {generating ? <><span className="generate-spinner" />Generating…</> : <>Generate <FiZap /><span>{cost}</span></>}
          </button>
        </aside>

        <section ref={contentRef} className="dashboard-workspace">
          <div className="workspace-toolbar">
            <div>
              <button className={workspaceTab === "history" ? "is-active" : ""} onClick={() => setWorkspaceTab("history")} type="button"><FiFolder />History</button>
              <button className={workspaceTab === "guide" ? "is-active" : ""} onClick={() => setWorkspaceTab("guide")} type="button"><FiHelpCircle />How it works</button>
            </div>
            <span>{mode === "video" ? `${videoFlow === "create" ? "Create" : "Edit"} video` : "Create image"}</span>
          </div>

          {workspaceTab === "history" ? (
            <HistoryPanel generated={generated} mode={mode} />
          ) : mode === "image" ? (
            <ImageWorkspace generated={generated} />
          ) : (
            <VideoWorkspace flow={videoFlow} generated={generated} />
          )}
        </section>
      </div>
    </main>
  );
}

function VideoWorkspace({ flow, generated }: { flow: VideoFlow; generated: boolean }) {
  const createSteps = [
    { image: "/HeroImages/hero2.jpeg", title: "Add image", copy: "Upload or choose an image to begin your animation.", Icon: FiUpload },
    { image: "/HeroImages/hero5.jpeg", title: "Choose preset", copy: "Pick a motion style to guide camera and subject movement.", Icon: FiSliders },
    { image: "/HeroImages/hero7.jpeg", title: "Get video", copy: "Generate your final cinematic clip and download it.", Icon: FiPlay },
  ];
  const editSteps = [
    { image: "/HeroImages/hero4.jpeg", title: "Add video", copy: "Upload the clip you want to transform or extend.", Icon: FiVideo },
    { image: "/HeroImages/hero6.jpeg", title: "Describe edit", copy: "Explain the visual change, mood, or new environment.", Icon: FiEdit3 },
    { image: "/HeroImages/hero3.jpeg", title: "Export result", copy: "Review your transformed video and export in HD.", Icon: FiDownload },
  ];
  const steps = flow === "create" ? createSteps : editSteps;

  if (generated) return <GeneratedResult mode="video" />;

  return (
    <div className="workspace-guide">
      <div className="workspace-heading">
        <span>{flow === "create" ? "Image to video" : "AI video editor"}</span>
        <h1>{flow === "create" ? "Make videos in one click" : "Transform every frame"}</h1>
        <p>{flow === "create" ? "Upload an image, choose a movement preset, and turn a still moment into a cinematic story." : "Upload footage and describe the change—8xMotion handles the transformation."}</p>
      </div>
      <div className="guide-steps">
        {steps.map(({ image, title, copy, Icon }, index) => (
          <article key={title}>
            <div><Image src={image} alt="" fill sizes="28vw" /><span>{index + 1}</span><Icon /></div>
            <h2>{title}</h2><p>{copy}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ImageWorkspace({ generated }: { generated: boolean }) {
  if (generated) return <GeneratedResult mode="image" />;
  return (
    <div className="image-workspace">
      <div className="workspace-heading">
        <span>Text to image</span>
        <h1>Imagine it. Make it real.</h1>
        <p>Describe your vision, choose a style, and generate production-ready imagery in seconds.</p>
      </div>
      <CardFanCarousel cards={inspirationCards} />
      <div className="image-workspace__hint"><FiZap /><span>Choose a reference card or write your own prompt to start.</span></div>
    </div>
  );
}

function GeneratedResult({ mode }: { mode: CreationMode }) {
  return (
    <div className="generated-result">
      <div className="generated-result__media">
        {mode === "video" ? (
          <video src="/Circular_Slider/Woman_walking_on_skyscraper_rooftop_20260921005546.mp4" autoPlay muted loop playsInline />
        ) : (
          <Image src="/Female_model_posing_in_architecture_20260921034158.jpeg" alt="Generated AI result" fill sizes="70vw" />
        )}
      </div>
      <div><span><FiCheck />Generation complete</span><h1>Your {mode} is ready</h1><p>This frontend preview simulates the completed generation state.</p><button type="button"><FiDownload />Download</button></div>
    </div>
  );
}

function HistoryPanel({ generated, mode }: { generated: boolean; mode: CreationMode }) {
  return (
    <div className="history-panel">
      <div className="workspace-heading"><span>Your library</span><h1>Generation history</h1><p>Recent creations will appear here when backend persistence is connected.</p></div>
      {generated ? <GeneratedResult mode={mode} /> : <div className="history-empty"><FiClock /><h2>No generations yet</h2><p>Create your first {mode} to start building your history.</p></div>}
    </div>
  );
}
