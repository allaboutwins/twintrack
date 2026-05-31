import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { posthog } from "@/lib/posthog";
import logoAatUrl from "../assets/logo-aat.png";
import {
  useListMilestones,
  useCreateMilestone,
  useDeleteMilestone,
  getListMilestonesQueryKey,
  useListTwins,
  getListTwinsQueryKey,
  useRequestUploadUrl,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Plus, Trash2, X, Check, Camera, Share2, ImageIcon } from "lucide-react";

const MILESTONE_PRESETS = [
  { key: "first-smile", label: "First Smile", emoji: "😊" },
  { key: "first-laugh", label: "First Laugh", emoji: "😂" },
  { key: "rolled-over", label: "Rolled Over", emoji: "🔄" },
  { key: "sat-up", label: "Sat Up", emoji: "🧘" },
  { key: "crawled", label: "Crawled", emoji: "🐛" },
  { key: "first-tooth", label: "First Tooth", emoji: "🦷" },
  { key: "first-word", label: "First Word", emoji: "💬" },
  { key: "first-steps", label: "First Steps", emoji: "👣" },
  { key: "slept-through-night", label: "Slept Through the Night", emoji: "🌙" },
  { key: "first-daycare", label: "First Daycare Day", emoji: "🎒" },
  { key: "first-birthday", label: "First Birthday", emoji: "🎂" },
  { key: "potty-training", label: "Potty Training", emoji: "🚽" },
  { key: "first-school", label: "First Day of School", emoji: "🏫" },
  { key: "custom", label: "Custom Milestone ✨", emoji: "⭐" },
];

const ENCOURAGEMENTS = [
  "You'll never forget this moment 💕",
  "Twin A just unlocked a beautiful new milestone 💕",
  "Every milestone is a memory forever 🌟",
  "You're watching magic happen ✨",
  "This is one of those moments 💛",
  "Precious. Just precious. 🥹",
];

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function createShareCard(
  milestone: { title: string; category: string; achievedDate: string; note?: string | null; photoUrl?: string | null; twinId: number },
  twin: { name: string; label: string; colorTheme: string } | undefined,
  _preset: { emoji: string } | undefined,
): Promise<Blob | null> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const twinColor = twin?.colorTheme ?? "#da5a9f";
  const twinName = twin?.name || twin?.label || "Our Twins";
  const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });
  const rgb = hexToRgb(twinColor);
  const SERIF = `Georgia, "Times New Roman", serif`;
  const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

  // Load photo
  let photoImg: HTMLImageElement | null = null;
  let photoBlobUrl: string | null = null;
  if (milestone.photoUrl) {
    try {
      const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      const photoPath = milestone.photoUrl.startsWith("/") ? milestone.photoUrl : `/${milestone.photoUrl}`;
      const r = await fetch(`${baseUrl}/api/storage${photoPath}`);
      if (r.ok) {
        const blob = await r.blob();
        photoBlobUrl = URL.createObjectURL(blob);
        photoImg = await new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = photoBlobUrl!;
        });
      }
    } catch { photoImg = null; }
  }

  // Load AAT logo
  let aatLogo: HTMLImageElement | null = null;
  try {
    aatLogo = await new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = logoAatUrl;
    });
  } catch { aatLogo = null; }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Shared helper: draw bottom branding row inside a footer rect
  const c = ctx;
  function drawBranding(footerY: number, footerH: number, onDark: boolean) {
    const midY = footerY + footerH - 44;
    c.save();
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillStyle = onDark ? "rgba(255,255,255,0.5)" : `rgba(${rgb.r},${rgb.g},${rgb.b},0.45)`;
    c.font = `400 24px ${SANS}`;
    c.fillText("Made with TwinTrack 💕", 38, midY);
    c.restore();
    if (aatLogo) {
      const logoH = 52;
      const logoW = Math.round((aatLogo.width / aatLogo.height) * logoH);
      c.globalAlpha = onDark ? 0.7 : 0.55;
      c.drawImage(aatLogo, W - 38 - logoW, midY - logoH / 2, logoW, logoH);
      c.globalAlpha = 1;
    }
  }

  if (photoImg) {
    const HEADER_H = 88;
    const FOOTER_H = 230;
    const PHOTO_H = H - HEADER_H - FOOTER_H; // 762

    // ── Thin top band ──
    const topGrad = ctx.createLinearGradient(0, 0, 0, HEADER_H);
    topGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.97)`);
    topGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.80)`);
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, HEADER_H);

    // Twin name · date in header
    ctx.fillStyle = "rgba(255,255,255,0.93)";
    ctx.font = `500 30px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${twinName}  ·  ${formatDate(milestone.achievedDate)}`, W / 2, HEADER_H / 2);

    // ── Photo (hero) ──
    const aspectSrc = photoImg.width / photoImg.height;
    const aspectDst = W / PHOTO_H;
    let sx = 0, sy = 0, sw = photoImg.width, sh = photoImg.height;
    if (aspectSrc > aspectDst) {
      sw = Math.round(photoImg.height * aspectDst);
      sx = Math.round((photoImg.width - sw) / 2);
    } else {
      sh = Math.round(photoImg.width / aspectDst);
      sy = Math.round((photoImg.height - sh) / 2);
    }
    ctx.drawImage(photoImg, sx, sy, sw, sh, 0, HEADER_H, W, PHOTO_H);

    // Subtle shadow fade at bottom of photo into footer
    const photoFade = ctx.createLinearGradient(0, HEADER_H + PHOTO_H - 80, 0, HEADER_H + PHOTO_H);
    photoFade.addColorStop(0, "rgba(255,255,255,0)");
    photoFade.addColorStop(1, "rgba(255,255,255,0.3)");
    ctx.fillStyle = photoFade;
    ctx.fillRect(0, HEADER_H + PHOTO_H - 80, W, 80);

    // ── Footer ──
    const footerY = HEADER_H + PHOTO_H;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, footerY, W, FOOTER_H);

    // Thin accent rule at top of footer
    ctx.fillStyle = twinColor;
    ctx.fillRect(0, footerY, W, 3);

    // Title in elegant serif
    ctx.fillStyle = "#18181b";
    ctx.font = `bold 50px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const titleLines = wrapTextLines(ctx, milestone.title, W - 120);
    let ty = footerY + 28;
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, ty);
      ty += 60;
    }

    drawBranding(footerY, FOOTER_H, false);
  } else {
    // ── No-photo: elegant minimal layout ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#faf9f8");
    bgGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.07)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Top accent line
    ctx.fillStyle = twinColor;
    ctx.fillRect(0, 0, W, 10);

    // Bottom accent line
    ctx.fillStyle = twinColor;
    ctx.fillRect(0, H - 10, W, 10);

    // Small decorative dots
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(W / 2 - 40 + i * 20, 290, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title (large Georgia serif)
    ctx.fillStyle = "#18181b";
    ctx.font = `bold 72px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const titleLines = wrapTextLines(ctx, milestone.title, W - 180);
    let y = 340;
    for (const line of titleLines.slice(0, 3)) {
      ctx.fillText(line, W / 2, y);
      y += 88;
    }

    // Thin decorative rule
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.32)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 90, y + 22);
    ctx.lineTo(W / 2 + 90, y + 22);
    ctx.stroke();

    // Twin name
    ctx.fillStyle = twinColor;
    ctx.font = `600 48px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(twinName, W / 2, y + 50);

    // Date
    ctx.fillStyle = "#999999";
    ctx.font = `36px ${SANS}`;
    ctx.fillText(formatDate(milestone.achievedDate), W / 2, y + 114);

    // Note
    if (milestone.note) {
      ctx.fillStyle = "#666666";
      ctx.font = `italic 33px ${SERIF}`;
      const noteLines = wrapTextLines(ctx, `"${milestone.note}"`, W - 220);
      let ny = y + 178;
      for (const line of noteLines.slice(0, 2)) {
        ctx.fillText(line, W / 2, ny);
        ny += 50;
      }
    }

    // Branding at bottom
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.45)`;
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText("Made with TwinTrack 💕", 38, H - 54);
    if (aatLogo) {
      const logoH = 52;
      const logoW = Math.round((aatLogo.width / aatLogo.height) * logoH);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(aatLogo, W - 38 - logoW, H - 54 - logoH / 2, logoW, logoH);
      ctx.globalAlpha = 1;
    }
  }

  if (photoBlobUrl) URL.revokeObjectURL(photoBlobUrl);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

const CONFETTI_PARTICLES = Array.from({ length: 65 }, (_, i) => {
  const shapes = ["rect", "square", "circle", "thin"] as const;
  const colors = ["#da5a9f", "#2e818c", "#83b8c0", "#ffd700", "#ff8fab", "#a8e6cf", "#ffc8dd", "#ffe4b5", "#c9f0ff"];
  const emojis = ["💕", "✨", "⭐", "🌟", "💫", "🌸", "🥹", "💖"];
  return {
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.9,
    duration: 1.6 + Math.random() * 2,
    size: 7 + Math.random() * 11,
    rotation: Math.random() * 360,
    drift: Math.round((Math.random() - 0.5) * 240),
    spin: Math.round((Math.random() < 0.5 ? 1 : -1) * (200 + Math.random() * 500)),
    color: colors[i % colors.length],
    shape: shapes[i % shapes.length],
    isEmoji: i % 7 === 0,
    emoji: emojis[i % emojis.length],
  };
});

function PremiumConfetti({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-24px) translateX(0px) rotate(0deg); opacity: 1; }
          15% { opacity: 1; }
          85% { opacity: 0.8; }
          100% { transform: translateY(105vh) translateX(var(--confetti-drift)) rotate(var(--confetti-spin)); opacity: 0; }
        }
        @keyframes confettiWobble {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(0.65); }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {CONFETTI_PARTICLES.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: 0,
              "--confetti-drift": `${p.drift}px`,
              "--confetti-spin": `${p.spin}deg`,
              animation: `confettiFall ${p.duration}s cubic-bezier(0.215, 0.61, 0.355, 1) ${p.delay}s both`,
            } as React.CSSProperties}
          >
            {p.isEmoji ? (
              <span
                style={{
                  fontSize: p.size + 10,
                  display: "block",
                  animation: `confettiWobble ${0.4 + Math.random() * 0.4}s ease-in-out infinite`,
                }}
              >
                {p.emoji}
              </span>
            ) : (
              <div
                style={{
                  width: p.shape === "thin" ? Math.round(p.size * 0.22) : p.shape === "circle" ? p.size : p.size,
                  height:
                    p.shape === "circle"
                      ? p.size
                      : p.shape === "thin"
                        ? Math.round(p.size * 2.2)
                        : Math.round(p.size * 0.48),
                  backgroundColor: p.color,
                  borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : "1.5px",
                  transform: `rotate(${p.rotation}deg)`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default function Milestones() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "twinA" | "twinB">("all");
  const [showModal, setShowModal] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [encouragement, setEncouragement] = useState("");
  const [celebrationEmoji, setCelebrationEmoji] = useState("💕");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMilestone, setCelebrationMilestone] = useState<{
    id: number; category: string; title: string; achievedDate: string; note?: string | null; photoUrl?: string | null; twinId: number;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [form, setForm] = useState({
    twinId: 0,
    category: "",
    title: "",
    achievedDate: new Date().toISOString().split("T")[0],
    note: "",
    isCustom: false,
    photoUrl: null as string | null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [shareToast, setShareToast] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestUploadUrl = useRequestUploadUrl();

  const { data: twins = [] } = useListTwins(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListTwinsQueryKey({ userId: user?.id ?? "" }) } },
  );

  const twinA = twins.find((t) => t.label === "Twin A");
  const twinB = twins.find((t) => t.label === "Twin B");

  const activeTwinId =
    activeTab === "twinA" ? twinA?.id : activeTab === "twinB" ? twinB?.id : undefined;

  const { data: milestones = [], isLoading } = useListMilestones(
    { userId: user?.id ?? "", ...(activeTwinId ? { twinId: activeTwinId } : {}) },
    {
      query: {
        enabled: !!user?.id,
        queryKey: getListMilestonesQueryKey({ userId: user?.id ?? "", ...(activeTwinId ? { twinId: activeTwinId } : {}) }),
      },
    },
  );

  const createMilestone = useCreateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const allMilestones = [...milestones].sort(
    (a, b) => new Date(b.achievedDate).getTime() - new Date(a.achievedDate).getTime(),
  );

  function openModal() {
    setForm({
      twinId: twinA?.id ?? 0,
      category: "",
      title: "",
      achievedDate: new Date().toISOString().split("T")[0],
      note: "",
      isCustom: false,
      photoUrl: null,
    });
    setPhotoPreview(null);
    setShowModal(true);
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setIsUploadingPhoto(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setForm((f) => ({ ...f, photoUrl: objectPath }));
    } catch {
      setPhotoPreview(null);
      setForm((f) => ({ ...f, photoUrl: null }));
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleShare(milestone: { id: number; category: string; title: string; achievedDate: string; note?: string | null; photoUrl?: string | null; twinId: number }) {
    const twin = getTwinForMilestone(milestone.twinId);
    const preset = MILESTONE_PRESETS.find((m) => m.key === milestone.category);
    const twinName = twin?.name || twin?.label || "Our twin";

    const fallbackText = [
      `${preset?.emoji ?? "🎉"} ${twinName} just hit a milestone: ${milestone.title}!`,
      `📅 ${formatDate(milestone.achievedDate)}`,
      milestone.note ? `💭 "${milestone.note}"` : null,
      `\nMade with TwinTrack 💕`,
    ].filter(Boolean).join("\n");

    setIsSharing(milestone.id);
    try {
      const blob = await createShareCard(milestone, twin ?? undefined, preset);
      if (blob) {
        const file = new File([blob], "my-memory.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: milestone.title, text: "Made with TwinTrack 💕" });
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${milestone.title.replace(/\s+/g, "-")}-memory.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShareToast(milestone.id);
        setTimeout(() => setShareToast(null), 2500);
        return;
      }
    } catch { /* fall through */ }
    finally { setIsSharing(null); }

    if (navigator.share) {
      navigator.share({ text: fallbackText }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(fallbackText).catch(() => {});
      setShareToast(milestone.id);
      setTimeout(() => setShareToast(null), 2000);
    }
  }

  function selectPreset(key: string, label: string) {
    const isCustom = key === "custom";
    setForm((f) => ({
      ...f,
      category: key,
      title: isCustom ? "" : label,
      isCustom,
    }));
  }

  function handleSave() {
    if (!user?.id || !form.twinId || !form.category || !form.achievedDate) return;
    const title = form.isCustom ? form.title : (MILESTONE_PRESETS.find((m) => m.key === form.category)?.label ?? form.title);
    if (!title) return;

    createMilestone.mutate(
      {
        data: {
          userId: user.id,
          twinId: form.twinId,
          category: form.category,
          title,
          achievedDate: form.achievedDate,
          note: form.note || null,
          photoUrl: form.photoUrl,
        },
      },
      {
        onSuccess: (data) => {
          posthog?.capture("milestone_created", { category: form.category });
          qc.invalidateQueries({ queryKey: getListMilestonesQueryKey({ userId: user.id }) });
          setCelebrationMilestone(data as typeof celebrationMilestone);
          setShowModal(false);
          const enc = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
          setEncouragement(enc);
          const preset = MILESTONE_PRESETS.find((m) => m.key === form.category);
          setCelebrationEmoji(preset?.emoji ?? "💕");
          setConfetti(true);
          setShowCelebration(true);
          setTimeout(() => {
            setConfetti(false);
            setTimeout(() => setShowCelebration(false), 4200);
          }, 3000);
        },
      },
    );
  }

  function handleDelete(id: number) {
    deleteMilestone.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMilestonesQueryKey({ userId: user?.id ?? "" }) });
          setDeleteConfirm(null);
        },
      },
    );
  }

  function getTwinForMilestone(twinId: number) {
    return twins.find((t) => t.id === twinId);
  }

  const milestonesByTwin = {
    A: allMilestones.filter((m) => m.twinId === twinA?.id),
    B: allMilestones.filter((m) => m.twinId === twinB?.id),
  };

  const commonCategories = milestonesByTwin.A
    .map((m) => m.category)
    .filter((cat) => milestonesByTwin.B.some((m) => m.category === cat));

  return (
    <Layout>
      <PremiumConfetti show={confetti} />
      <PageHeader title="Memories" subtitle="Your twin milestone timeline" />

      {/* Celebration overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-8 pointer-events-none">
          <div
            className="pointer-events-auto bg-white/98 border border-primary/25 rounded-3xl px-8 py-8 text-center shadow-2xl w-full max-w-sm"
            style={{ animation: "fadeScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
          >
            <style>{`
              @keyframes fadeScaleIn {
                from { opacity: 0; transform: scale(0.85) translateY(12px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>
            <div className="text-6xl mb-3" style={{ lineHeight: 1 }}>{celebrationEmoji}</div>
            <p className="font-bold text-foreground text-xl leading-snug mb-3">{encouragement}</p>
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Memory saved to your timeline</span>
            </div>
            {celebrationMilestone && (
              <button
                onClick={() => handleShare(celebrationMilestone)}
                disabled={isSharing === celebrationMilestone.id}
                className="w-full py-3 rounded-2xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
                data-testid="celebration-share-btn"
              >
                <Share2 size={15} />
                {isSharing === celebrationMilestone.id ? "Creating card…" : "Share this memory 💕"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2 border-b border-border">
        {[
          { key: "all", label: "All Memories" },
          { key: "twinA", label: twinA?.name || "Twin A" },
          { key: "twinB", label: twinB?.name || "Twin B" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}
            data-testid={`tab-milestone-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Add milestone button */}
        <button
          onClick={openModal}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all"
          data-testid="button-add-milestone"
        >
          <Plus size={18} />
          Log a New Milestone
        </button>

        {/* Twin comparison (only when viewing "all") */}
        {activeTab === "all" && twinA && twinB && commonCategories.length > 0 && (
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/15 p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Twin Journey</p>
            <p className="text-xs text-muted-foreground mb-3">
              Both {twinA.name || "Twin A"} and {twinB.name || "Twin B"} have reached{" "}
              {commonCategories.length} milestone{commonCategories.length !== 1 ? "s" : ""} so far. 💕
              {" "}Every twin develops beautifully in their own time.
            </p>
            <div className="flex gap-2 flex-wrap">
              {commonCategories.map((cat) => {
                const preset = MILESTONE_PRESETS.find((m) => m.key === cat);
                return (
                  <span key={cat} className="text-xs bg-white border border-primary/20 px-2 py-1 rounded-full text-foreground font-medium">
                    {preset?.emoji} {preset?.label ?? cat}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allMilestones.length === 0 && (
          <div className="text-center py-14 space-y-3">
            <p className="text-5xl">💕</p>
            <p className="font-semibold text-foreground">No milestones yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Every first moment deserves to be remembered. Tap above to log your first milestone.
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-3">
          {allMilestones.map((milestone) => {
            const twin = getTwinForMilestone(milestone.twinId);
            const preset = MILESTONE_PRESETS.find((m) => m.key === milestone.category);
            return (
              <div
                key={milestone.id}
                className="bg-white rounded-2xl border border-border overflow-hidden"
                data-testid={`milestone-${milestone.id}`}
              >
                <div className="px-4 py-4 flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{preset?.emoji ?? "⭐"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{milestone.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(milestone.achievedDate)}</p>
                      </div>
                      {twin && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: twin.colorTheme }}
                        >
                          {(twin.name || twin.label).charAt(0)}
                        </div>
                      )}
                    </div>
                    {twin && (
                      <p className="text-xs font-medium mt-1" style={{ color: twin.colorTheme }}>
                        {twin.name || twin.label}
                      </p>
                    )}
                    {milestone.note && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed italic">
                        "{milestone.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Photo */}
                {milestone.photoUrl && (
                  <img
                    src={`${(import.meta.env.BASE_URL ?? "/").replace(/\/$/, "")}/api/storage${milestone.photoUrl.startsWith("/") ? milestone.photoUrl : `/${milestone.photoUrl}`}`}
                    alt={milestone.title}
                    className="w-full h-48 object-cover"
                  />
                )}

                {/* Actions */}
                <div className="border-t border-border px-4 py-2 flex items-center justify-between">
                  <button
                    onClick={() => handleShare(milestone)}
                    disabled={isSharing === milestone.id}
                    className="text-xs text-primary font-semibold flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-60"
                    data-testid={`share-milestone-${milestone.id}`}
                  >
                    {isSharing === milestone.id ? (
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Share2 size={12} />
                    )}
                    {shareToast === milestone.id ? "Saved! ✓" : isSharing === milestone.id ? "Creating…" : "Share Card"}
                  </button>

                  {deleteConfirm === milestone.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Remove this memory?</span>
                      <button
                        onClick={() => handleDelete(milestone.id)}
                        className="text-xs text-destructive font-semibold px-3 py-1 rounded-lg bg-destructive/10"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-muted-foreground font-semibold px-3 py-1 rounded-lg bg-muted"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(milestone.id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 py-1 px-2"
                      data-testid={`delete-milestone-${milestone.id}`}
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Milestone Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl overflow-y-auto max-h-[90dvh]">
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-foreground text-lg">Log a Milestone</p>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-muted"
                data-testid="close-milestone-modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5 pb-8">
              {/* Which twin */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">For which twin?</label>
                <div className="flex gap-2">
                  {twins.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setForm((f) => ({ ...f, twinId: t.id }))}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                        form.twinId === t.id ? "text-white" : "bg-muted text-muted-foreground"
                      }`}
                      style={form.twinId === t.id ? { backgroundColor: t.colorTheme } : {}}
                      data-testid={`select-twin-${t.id}`}
                    >
                      {t.name || t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestone type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Milestone</label>
                <div className="grid grid-cols-2 gap-2">
                  {MILESTONE_PRESETS.map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      onClick={() => selectPreset(key, label)}
                      className={`text-left px-3 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                        form.category === key ? "bg-primary text-white" : "bg-muted text-foreground"
                      }`}
                      data-testid={`milestone-preset-${key}`}
                    >
                      <span className="text-base">{emoji}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom title */}
              {form.isCustom && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Custom milestone name</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Describe this milestone..."
                    className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30"
                    data-testid="input-custom-milestone"
                  />
                </div>
              )}

              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Date achieved</label>
                <input
                  type="date"
                  value={form.achievedDate}
                  onChange={(e) => setForm((f) => ({ ...f, achievedDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30"
                  data-testid="input-milestone-date"
                />
              </div>

              {/* Memory note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Memory note (optional)</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="How did it happen? What were you feeling?..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
                  data-testid="input-milestone-note"
                />
              </div>

              {/* Photo upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Add a Photo (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                  data-testid="input-milestone-photo"
                />
                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <button
                      onClick={() => { setPhotoPreview(null); setForm((f) => ({ ...f, photoUrl: null })); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <Camera size={18} />
                    Take or choose a photo
                  </button>
                )}
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={createMilestone.isPending || isUploadingPhoto || !form.category || !form.twinId || (form.isCustom && !form.title)}
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                data-testid="button-save-milestone"
              >
                {isUploadingPhoto ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading photo...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Save This Memory
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
