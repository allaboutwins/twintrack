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
import { Plus, Trash2, X, Check, Camera, Share2, ImageIcon, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

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

type CardTheme = "modern" | "minimal" | "floral" | "signature";

const CARD_THEMES: { id: CardTheme; name: string; desc: string; preview: string }[] = [
  { id: "modern", name: "Modern", desc: "Clean header · photo hero", preview: "modern" },
  { id: "minimal", name: "Minimal", desc: "Photo first · ultra clean", preview: "minimal" },
  { id: "floral", name: "Floral", desc: "Botanical warmth · cream", preview: "floral" },
  { id: "signature", name: "Signature", desc: "TwinTrack branded · hearts", preview: "signature" },
];

const QUICK_PRESETS = {
  age: [
    { label: "1 Month Old", emoji: "🎉", key: "age-1m" },
    { label: "2 Months Old", emoji: "🌱", key: "age-2m" },
    { label: "3 Months Old", emoji: "☀️", key: "age-3m" },
    { label: "4 Months Old", emoji: "🌟", key: "age-4m" },
    { label: "5 Months Old", emoji: "💫", key: "age-5m" },
    { label: "6 Months Old", emoji: "🎊", key: "age-6m" },
    { label: "7 Months Old", emoji: "🌈", key: "age-7m" },
    { label: "8 Months Old", emoji: "🌸", key: "age-8m" },
    { label: "9 Months Old", emoji: "✨", key: "age-9m" },
    { label: "10 Months Old", emoji: "🍀", key: "age-10m" },
    { label: "11 Months Old", emoji: "🌙", key: "age-11m" },
    { label: "1 Year Old", emoji: "🎂", key: "age-1y" },
    { label: "18 Months Old", emoji: "🌻", key: "age-18m" },
    { label: "2 Years Old", emoji: "🎈", key: "age-2y" },
    { label: "3 Years Old", emoji: "⭐", key: "age-3y" },
  ],
  twin: [
    { label: "First Twin Hug", emoji: "🤗", key: "twin-hug" },
    { label: "Holding Hands", emoji: "🤝", key: "twin-hands" },
    { label: "First Twin Giggle", emoji: "😂", key: "twin-giggle" },
    { label: "Best Friends Forever", emoji: "💕", key: "twin-bff" },
    { label: "First Bath Together", emoji: "🛁", key: "twin-bath" },
    { label: "Tummy Time Together", emoji: "💪", key: "twin-tummy" },
    { label: "Sleeping Together", emoji: "😴", key: "twin-sleep" },
    { label: "First Twin Photo", emoji: "📸", key: "twin-photo" },
  ],
  holiday: [
    { label: "Merry Christmas", emoji: "🎄", key: "holiday-xmas" },
    { label: "Happy Easter", emoji: "🐰", key: "holiday-easter" },
    { label: "Happy Halloween", emoji: "🎃", key: "holiday-halloween" },
    { label: "Happy New Year", emoji: "🎆", key: "holiday-newyear" },
    { label: "Mother's Day", emoji: "🌸", key: "holiday-mothers" },
    { label: "Father's Day", emoji: "👨‍👧‍👦", key: "holiday-fathers" },
    { label: "Valentine's Day", emoji: "❤️", key: "holiday-valentine" },
    { label: "Happy Hanukkah", emoji: "🕎", key: "holiday-hanukkah" },
  ],
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function drawFloralCorner(
  c: CanvasRenderingContext2D,
  x: number, y: number, rotation: number,
  rgb: { r: number; g: number; b: number },
) {
  c.save();
  c.translate(x, y);
  c.rotate(rotation);
  for (let i = 0; i < 5; i++) {
    const ang = (i * Math.PI * 2) / 5;
    c.save();
    c.rotate(ang);
    c.beginPath();
    c.ellipse(52, 0, 34, 17, 0, 0, Math.PI * 2);
    c.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.13)`;
    c.fill();
    c.restore();
  }
  c.beginPath();
  c.arc(0, 0, 18, 0, Math.PI * 2);
  c.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`;
  c.fill();
  for (let i = 0; i < 3; i++) {
    const la = Math.PI * 0.3 + (i * Math.PI * 2) / 3;
    c.save();
    c.rotate(la);
    c.beginPath();
    c.moveTo(18, 0);
    c.bezierCurveTo(42, -14, 88, -4, 110, 0);
    c.bezierCurveTo(88, 4, 42, 14, 18, 0);
    c.fillStyle = "rgba(100,148,75,0.16)";
    c.fill();
    c.restore();
  }
  c.save();
  c.translate(92, -72);
  for (let i = 0; i < 5; i++) {
    const ang = (i * Math.PI * 2) / 5;
    c.save();
    c.rotate(ang);
    c.beginPath();
    c.ellipse(26, 0, 18, 10, 0, 0, Math.PI * 2);
    c.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.10)`;
    c.fill();
    c.restore();
  }
  c.beginPath();
  c.arc(0, 0, 10, 0, Math.PI * 2);
  c.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`;
  c.fill();
  c.restore();
  c.restore();
}

function drawHeartAt(
  c: CanvasRenderingContext2D,
  x: number, y: number, size: number, color: string, alpha: number,
) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y + size * 0.3);
  c.bezierCurveTo(x - size * 0.5, y - size * 0.15, x - size * 0.92, y + size * 0.28, x, y + size * 0.92);
  c.bezierCurveTo(x + size * 0.92, y + size * 0.28, x + size * 0.5, y - size * 0.15, x, y + size * 0.3);
  c.closePath();
  c.fill();
  c.restore();
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
  theme: CardTheme = "modern",
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

  const c = ctx;

  function coverPhoto(px: number, py: number, pw: number, ph: number) {
    if (!photoImg) return;
    const ar = photoImg.width / photoImg.height;
    const dr = pw / ph;
    let sx = 0, sy = 0, sw = photoImg.width, sh = photoImg.height;
    if (ar > dr) { sw = Math.round(photoImg.height * dr); sx = Math.round((photoImg.width - sw) / 2); }
    else { sh = Math.round(photoImg.width / dr); sy = Math.round((photoImg.height - sh) / 2); }
    c.drawImage(photoImg, sx, sy, sw, sh, px, py, pw, ph);
  }

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
      const lh = 52;
      const lw = Math.round((aatLogo.width / aatLogo.height) * lh);
      c.globalAlpha = onDark ? 0.7 : 0.55;
      c.drawImage(aatLogo, W - 38 - lw, midY - lh / 2, lw, lh);
      c.globalAlpha = 1;
    }
  }

  // ═══════════════════════════════════════════════════════ MODERN ══
  if (theme === "modern") {
    if (photoImg) {
      const HEADER_H = 88;
      const FOOTER_H = 230;
      const PHOTO_H = H - HEADER_H - FOOTER_H;
      const topGrad = ctx.createLinearGradient(0, 0, 0, HEADER_H);
      topGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.97)`);
      topGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.80)`);
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, HEADER_H);
      ctx.fillStyle = "rgba(255,255,255,0.93)";
      ctx.font = `500 30px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${twinName}  ·  ${formatDate(milestone.achievedDate)}`, W / 2, HEADER_H / 2);
      coverPhoto(0, HEADER_H, W, PHOTO_H);
      const fade = ctx.createLinearGradient(0, HEADER_H + PHOTO_H - 80, 0, HEADER_H + PHOTO_H);
      fade.addColorStop(0, "rgba(255,255,255,0)");
      fade.addColorStop(1, "rgba(255,255,255,0.28)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, HEADER_H + PHOTO_H - 80, W, 80);
      const footerY = HEADER_H + PHOTO_H;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, footerY, W, FOOTER_H);
      ctx.fillStyle = twinColor;
      ctx.fillRect(0, footerY, W, 3);
      ctx.fillStyle = "#18181b";
      ctx.font = `bold 50px ${SERIF}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const lines = wrapTextLines(ctx, milestone.title, W - 120);
      let ty = footerY + 28;
      for (const line of lines.slice(0, 2)) { ctx.fillText(line, W / 2, ty); ty += 60; }
      drawBranding(footerY, FOOTER_H, false);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#faf9f8");
      bgGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.07)`);
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = twinColor; ctx.fillRect(0, 0, W, 10);
      ctx.fillStyle = twinColor; ctx.fillRect(0, H - 10, W, 10);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(W/2 - 40 + i*20, 290, 5, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = "#18181b"; ctx.font = `bold 72px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const lines = wrapTextLines(ctx, milestone.title, W - 180);
      let y = 340;
      for (const line of lines.slice(0, 3)) { ctx.fillText(line, W/2, y); y += 88; }
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.32)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W/2-90, y+22); ctx.lineTo(W/2+90, y+22); ctx.stroke();
      ctx.fillStyle = twinColor; ctx.font = `600 48px ${SANS}`; ctx.fillText(twinName, W/2, y+50);
      ctx.fillStyle = "#999999"; ctx.font = `36px ${SANS}`; ctx.fillText(formatDate(milestone.achievedDate), W/2, y+114);
      if (milestone.note) {
        ctx.fillStyle = "#666666"; ctx.font = `italic 33px ${SERIF}`;
        const nl = wrapTextLines(ctx, `"${milestone.note}"`, W - 220); let ny = y + 178;
        for (const line of nl.slice(0, 2)) { ctx.fillText(line, W/2, ny); ny += 50; }
      }
      drawBranding(0, H, false);
    }
  }

  // ═══════════════════════════════════════════════════════ MINIMAL ══
  else if (theme === "minimal") {
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    if (photoImg) {
      const PHOTO_H = 760;
      const FOOTER_H = H - PHOTO_H;
      coverPhoto(0, 0, W, PHOTO_H);
      const capGrad = ctx.createLinearGradient(0, 0, 0, 96);
      capGrad.addColorStop(0, "rgba(0,0,0,0.48)"); capGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = capGrad; ctx.fillRect(0, 0, W, 96);
      ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.font = `400 28px ${SANS}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${twinName}  ·  ${formatDate(milestone.achievedDate)}`, W/2, 46);
      const footerY = PHOTO_H;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, footerY, W, FOOTER_H);
      ctx.fillStyle = twinColor; ctx.fillRect(0, footerY, W, 2);
      ctx.fillStyle = "#111111"; ctx.font = `bold 54px ${SERIF}`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const lines = wrapTextLines(ctx, milestone.title, W - 120);
      let ty = footerY + 42;
      for (const line of lines.slice(0, 2)) { ctx.fillText(line, W/2, ty); ty += 66; }
      ctx.fillStyle = twinColor; ctx.font = `500 30px ${SANS}`; ctx.fillText(twinName, W/2, ty + 10); ty += 50;
      ctx.fillStyle = "#bbbbbb"; ctx.font = `26px ${SANS}`; ctx.fillText(formatDate(milestone.achievedDate), W/2, ty + 6);
      drawBranding(footerY, FOOTER_H, false);
    } else {
      ctx.fillStyle = twinColor; ctx.fillRect(0, 0, W, 6);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`; ctx.fillRect(0, H-6, W, 6);
      ctx.fillStyle = "#111111"; ctx.font = `bold 78px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const lines = wrapTextLines(ctx, milestone.title, W - 200);
      let y = 340;
      for (const line of lines.slice(0, 3)) { ctx.fillText(line, W/2, y); y += 94; }
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.26)`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(W/2-110, y+18); ctx.lineTo(W/2+110, y+18); ctx.stroke();
      ctx.fillStyle = twinColor; ctx.font = `600 46px ${SANS}`; ctx.fillText(twinName, W/2, y+44); y += 100;
      ctx.fillStyle = "#cccccc"; ctx.font = `34px ${SANS}`; ctx.fillText(formatDate(milestone.achievedDate), W/2, y);
      if (milestone.note) {
        ctx.fillStyle = "#888888"; ctx.font = `italic 32px ${SERIF}`;
        const nl = wrapTextLines(ctx, `"${milestone.note}"`, W-220); let ny = y+60;
        for (const line of nl.slice(0, 2)) { ctx.fillText(line, W/2, ny); ny += 48; }
      }
      drawBranding(0, H, false);
    }
  }

  // ═══════════════════════════════════════════════════════ FLORAL ══
  else if (theme === "floral") {
    ctx.fillStyle = "#faf7f2"; ctx.fillRect(0, 0, W, H);
    drawFloralCorner(ctx, 0, 0, 0, rgb);
    drawFloralCorner(ctx, W, H, Math.PI, rgb);
    if (photoImg) {
      const HEADER_H = 96;
      const FOOTER_H = 290;
      const PHOTO_H = H - HEADER_H - FOOTER_H;
      const topGrad = ctx.createLinearGradient(0, 0, 0, HEADER_H);
      topGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`); topGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, HEADER_H);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`; ctx.font = `500 30px ${SANS}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${twinName}  ·  ${formatDate(milestone.achievedDate)}`, W/2, HEADER_H/2);
      coverPhoto(0, HEADER_H, W, PHOTO_H);
      const footerY = HEADER_H + PHOTO_H;
      ctx.fillStyle = "#faf7f2"; ctx.fillRect(0, footerY, W, FOOTER_H);
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.20)`; ctx.fillRect(0, footerY, W, 2);
      ctx.fillStyle = "#3a2310"; ctx.font = `italic bold 48px ${SERIF}`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const lines = wrapTextLines(ctx, milestone.title, W - 140);
      let ty = footerY + 34;
      for (const line of lines.slice(0, 2)) { ctx.fillText(line, W/2, ty); ty += 62; }
      drawBranding(footerY, FOOTER_H, false);
    } else {
      drawFloralCorner(ctx, W, 0, Math.PI/2, rgb);
      drawFloralCorner(ctx, 0, H, -Math.PI/2, rgb);
      ctx.fillStyle = "#3a2310"; ctx.font = `italic bold 74px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const lines = wrapTextLines(ctx, milestone.title, W - 200);
      let y = 320;
      for (const line of lines.slice(0, 3)) { ctx.fillText(line, W/2, y); y += 90; }
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.30)`;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(W/2-20+i*20, y+22, 4, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = twinColor; ctx.font = `500 46px ${SANS}`; ctx.fillText(twinName, W/2, y+48); y += 104;
      ctx.fillStyle = "#a07850"; ctx.font = `36px ${SANS}`; ctx.fillText(formatDate(milestone.achievedDate), W/2, y);
      if (milestone.note) {
        ctx.fillStyle = "#7a5a3a"; ctx.font = `italic 32px ${SERIF}`;
        const nl = wrapTextLines(ctx, `"${milestone.note}"`, W-220); let ny = y+60;
        for (const line of nl.slice(0, 2)) { ctx.fillText(line, W/2, ny); ny += 48; }
      }
      drawBranding(0, H, false);
    }
  }

  // ═══════════════════════════════════════════════════════ SIGNATURE ══
  else {
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    if (photoImg) {
      const HEADER_H = 100;
      const FOOTER_H = 250;
      const PHOTO_H = H - HEADER_H - FOOTER_H;
      const hGrad = ctx.createLinearGradient(0, 0, W, 0);
      hGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.97)`);
      hGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.82)`);
      ctx.fillStyle = hGrad; ctx.fillRect(0, 0, W, HEADER_H);
      const hPos = [[0.08,0.25],[0.19,0.75],[0.33,0.28],[0.55,0.72],[0.70,0.22],[0.83,0.68],[0.93,0.38]];
      for (const [hx,hy] of hPos) drawHeartAt(ctx, hx*W, hy*HEADER_H, 16, "rgba(255,255,255,0.14)", 1);
      ctx.fillStyle = "#ffffff"; ctx.font = `600 30px ${SANS}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${twinName}  ·  ${formatDate(milestone.achievedDate)}`, W/2, HEADER_H/2);
      coverPhoto(0, HEADER_H, W, PHOTO_H);
      const footerY = HEADER_H + PHOTO_H;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, footerY, W, FOOTER_H);
      const fGrad = ctx.createLinearGradient(0, footerY, 0, H);
      fGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.04)`);
      fGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.10)`);
      ctx.fillStyle = fGrad; ctx.fillRect(0, footerY, W, FOOTER_H);
      ctx.fillStyle = twinColor; ctx.fillRect(0, footerY, W, 3);
      ctx.fillStyle = "#18181b"; ctx.font = `bold 50px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const lines = wrapTextLines(ctx, milestone.title, W - 120);
      let ty = footerY + 28;
      for (const line of lines.slice(0, 2)) { ctx.fillText(line, W/2, ty); ty += 62; }
      drawHeartAt(ctx, 50, footerY + FOOTER_H - 72, 18, twinColor, 0.32);
      drawHeartAt(ctx, W-50, footerY + FOOTER_H - 72, 18, twinColor, 0.32);
      drawBranding(footerY, FOOTER_H, false);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#ffffff"); bgGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.09)`);
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
      drawHeartAt(ctx, W/2, H*0.08, 290, twinColor, 0.06);
      ctx.fillStyle = twinColor; ctx.fillRect(0, 0, W, 10);
      ctx.fillStyle = "#18181b"; ctx.font = `bold 72px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const lines = wrapTextLines(ctx, milestone.title, W - 180);
      let y = 330;
      for (const line of lines.slice(0, 3)) { ctx.fillText(line, W/2, y); y += 88; }
      ctx.fillStyle = twinColor; ctx.font = `600 50px ${SANS}`;
      ctx.fillText(`❤ ${twinName} ❤`, W/2, y+30); y += 92;
      ctx.fillStyle = "#aaaaaa"; ctx.font = `36px ${SANS}`; ctx.fillText(formatDate(milestone.achievedDate), W/2, y);
      if (milestone.note) {
        ctx.fillStyle = "#777777"; ctx.font = `italic 33px ${SERIF}`;
        const nl = wrapTextLines(ctx, `"${milestone.note}"`, W-220); let ny = y+62;
        for (const line of nl.slice(0, 2)) { ctx.fillText(line, W/2, ny); ny += 50; }
      }
      drawBranding(0, H, false);
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

function ThemePreviewCard({ theme }: { theme: CardTheme }) {
  if (theme === "modern") return (
    <div className="h-full flex flex-col rounded-lg overflow-hidden border border-border/60">
      <div className="h-7 bg-primary/50" />
      <div className="flex-1 bg-slate-200/70" />
      <div className="h-7 bg-white border-t-2 border-primary/30" />
    </div>
  );
  if (theme === "minimal") return (
    <div className="h-full flex flex-col rounded-lg overflow-hidden border border-slate-100">
      <div className="flex-1 bg-slate-200/60 relative">
        <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-black/18 to-transparent" />
      </div>
      <div className="h-2 bg-primary/40" style={{ height: 2 }} />
      <div className="h-9 bg-white flex items-center justify-center">
        <div className="h-2 w-16 rounded-full bg-slate-200/80" />
      </div>
    </div>
  );
  if (theme === "floral") return (
    <div className="h-full flex flex-col rounded-lg overflow-hidden" style={{ background: "#faf7f2" }}>
      <div className="h-7 flex items-center justify-around px-2" style={{ background: "linear-gradient(to bottom, rgba(218,90,159,0.10), transparent)" }}>
        <span className="text-[9px] opacity-60">✿</span>
        <span className="text-[7px] opacity-40">✿</span>
        <span className="text-[9px] opacity-60">✿</span>
      </div>
      <div className="flex-1 bg-slate-200/60" />
      <div className="h-9" style={{ background: "#faf7f2", borderTop: "1.5px solid rgba(218,90,159,0.18)" }}>
        <div className="flex justify-center gap-1 pt-2">
          {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(218,90,159,0.25)" }} />)}
        </div>
      </div>
    </div>
  );
  return (
    <div className="h-full flex flex-col rounded-lg overflow-hidden border border-border/60">
      <div className="h-7 flex items-center justify-center gap-2 bg-primary/70">
        <span className="text-[9px] text-white/80">❤</span>
        <span className="text-[7px] text-white/60">❤</span>
        <span className="text-[9px] text-white/80">❤</span>
      </div>
      <div className="flex-1 bg-slate-200/60" />
      <div className="h-9 bg-white/95 border-t-2 border-primary/25 flex items-center justify-center">
        <div className="h-2 w-14 rounded-full bg-slate-200/80" />
      </div>
    </div>
  );
}

function ThemePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (theme: CardTheme) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<CardTheme>("modern");
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl overflow-hidden shadow-2xl">
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground text-lg">Choose Card Style</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pick a design for your memory card</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-muted"><X size={18} /></button>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {CARD_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setPicked(t.id)}
                className={`rounded-2xl overflow-hidden border-2 transition-all text-left ${
                  picked === t.id ? "border-primary shadow-md" : "border-border hover:border-primary/30"
                }`}
              >
                <div className="h-24 p-2">
                  <ThemePreviewCard theme={t.id} />
                </div>
                <div className="px-3 py-2.5 border-t border-border">
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    {picked === t.id && <Check size={11} className="text-primary flex-shrink-0" />}
                    {t.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => onSelect(picked)}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
          >
            <ImageIcon size={18} />
            Create Memory Card 💕
          </button>
        </div>
      </div>
    </div>
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
  const [pendingShare, setPendingShare] = useState<{
    id: number; category: string; title: string; achievedDate: string; note?: string | null; photoUrl?: string | null; twinId: number;
  } | null>(null);
  const [showQuickCards, setShowQuickCards] = useState(false);
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

  function openModal(prefill?: { title: string; category: string; isCustom: boolean }) {
    setForm({
      twinId: twinA?.id ?? 0,
      category: prefill?.category ?? "",
      title: prefill?.title ?? "",
      achievedDate: new Date().toISOString().split("T")[0],
      note: "",
      isCustom: prefill?.isCustom ?? false,
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

  type ShareableMilestone = { id: number; category: string; title: string; achievedDate: string; note?: string | null; photoUrl?: string | null; twinId: number };

  function startShare(milestone: ShareableMilestone) {
    setPendingShare(milestone);
  }

  async function executeShare(milestone: ShareableMilestone, theme: CardTheme) {
    setPendingShare(null);
    const twin = getTwinForMilestone(milestone.twinId);
    const preset = MILESTONE_PRESETS.find((m) => m.key === milestone.category);
    const twinName = twin?.name || twin?.label || "Our twin";
    const isHoliday = milestone.category.startsWith("holiday-");
    const isAge = milestone.category.startsWith("age-");

    posthog?.capture("memory_cards_created", { theme, category: milestone.category, has_photo: !!milestone.photoUrl });
    if (isHoliday) posthog?.capture("holiday_card_used", { key: milestone.category });
    if (isAge) posthog?.capture("monthly_card_used", { key: milestone.category });

    const fallbackText = [
      `${preset?.emoji ?? "🎉"} ${twinName} just hit a milestone: ${milestone.title}!`,
      `📅 ${formatDate(milestone.achievedDate)}`,
      milestone.note ? `💭 "${milestone.note}"` : null,
      `\nMade with TwinTrack 💕`,
    ].filter(Boolean).join("\n");

    setIsSharing(milestone.id);
    try {
      const blob = await createShareCard(milestone, twin ?? undefined, preset, theme);
      if (blob) {
        const file = new File([blob], "my-memory.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: milestone.title, text: "Made with TwinTrack 💕" });
          posthog?.capture("memory_cards_shared", { theme });
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
        posthog?.capture("memory_cards_downloaded", { theme });
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
                onClick={() => startShare(celebrationMilestone)}
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
        {/* Add milestone + templates buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => openModal()}
            className="flex-1 py-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:border-primary/60 hover:bg-primary/5 active:scale-95 transition-all"
            data-testid="button-add-milestone"
          >
            <Plus size={18} />
            Log a Memory
          </button>
          <button
            onClick={() => setShowQuickCards((v) => !v)}
            className={`py-4 px-4 rounded-2xl border-2 font-semibold text-sm flex items-center gap-1.5 transition-all ${
              showQuickCards
                ? "border-primary/60 bg-primary/8 text-primary"
                : "border-dashed border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/5"
            }`}
            data-testid="button-quick-cards"
          >
            <Sparkles size={16} />
            Templates
            {showQuickCards ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Quick Card Templates */}
        {showQuickCards && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">Quick Card Templates</p>
              <p className="text-xs text-muted-foreground">Tap a template to log it in one tap</p>
            </div>

            {/* Age Milestones */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>🎂</span> Age Milestones
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-0" style={{ scrollbarWidth: "none" }}>
                {QUICK_PRESETS.age.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      posthog?.capture("template_used", { type: "age", key: p.key });
                      openModal({ title: `${p.label}`, category: p.key, isCustom: true });
                      setShowQuickCards(false);
                    }}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-primary/8 hover:text-primary active:scale-95 transition-all"
                  >
                    <span className="text-base">{p.emoji}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Twin Moments */}
            <div className="px-4 pt-2 pb-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>💕</span> Twin Moments
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {QUICK_PRESETS.twin.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      posthog?.capture("template_used", { type: "twin", key: p.key });
                      openModal({ title: `${p.label}`, category: p.key, isCustom: true });
                      setShowQuickCards(false);
                    }}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-primary/8 hover:text-primary active:scale-95 transition-all"
                  >
                    <span className="text-base">{p.emoji}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Holiday Cards */}
            <div className="px-4 pt-2 pb-4">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>🎄</span> Holiday Cards
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {QUICK_PRESETS.holiday.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      posthog?.capture("template_used", { type: "holiday", key: p.key });
                      posthog?.capture("holiday_card_used", { key: p.key, source: "template_picker" });
                      openModal({ title: `${p.label}`, category: p.key, isCustom: true });
                      setShowQuickCards(false);
                    }}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-primary/8 hover:text-primary active:scale-95 transition-all"
                  >
                    <span className="text-base">{p.emoji}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
                    onClick={() => startShare(milestone)}
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
      {/* Theme Picker Modal */}
      {pendingShare && (
        <ThemePickerModal
          onSelect={(theme) => executeShare(pendingShare, theme)}
          onClose={() => setPendingShare(null)}
        />
      )}
    </Layout>
  );
}
