import { useState } from "react";
import { useCreateVideo, getListVideosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Plus, Check, Youtube, Film } from "lucide-react";

const CATEGORIES = [
  { key: "sleep", label: "Sleep" },
  { key: "feeding", label: "Feeding" },
  { key: "breastfeeding-twins", label: "Breastfeeding Twins" },
  { key: "twin-pregnancy", label: "Twin Pregnancy" },
  { key: "toddler-life", label: "Toddler Life" },
  { key: "routines", label: "Routines" },
  { key: "mental-health", label: "Mental Health" },
  { key: "nicu", label: "NICU Support" },
  { key: "premature-twins", label: "Premature Twins" },
  { key: "potty-training", label: "Potty Training" },
  { key: "schedules", label: "Schedules" },
  { key: "expert-advice", label: "Expert Advice" },
  { key: "product-recommendations", label: "Product Recommendations" },
  { key: "tips", label: "Tips" },
  { key: "day-in-the-life", label: "Day in the Life" },
];

type SourceType = "youtube" | "other";

function getYouTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function autoFillThumbnail(url: string) {
  const id = getYouTubeId(url);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return "";
}

export default function VideoAdmin() {
  const qc = useQueryClient();
  const createVideo = useCreateVideo();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "sleep",
    sourceType: "youtube" as SourceType,
    url: "",
    thumbnailUrl: "",
    durationSeconds: "",
  });

  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleUrlChange(url: string) {
    const thumbnail = autoFillThumbnail(url);
    setForm((f) => ({
      ...f,
      url,
      thumbnailUrl: f.thumbnailUrl || thumbnail,
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.url.trim()) e.url = "URL is required";
    if (!form.category) e.category = "Category is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    createVideo.mutate(
      {
        data: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          sourceType: form.sourceType,
          url: form.url.trim(),
          thumbnailUrl: form.thumbnailUrl.trim() || null,
          durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListVideosQueryKey({}) });
          setForm({
            title: "",
            description: "",
            category: "sleep",
            sourceType: "youtube",
            url: "",
            thumbnailUrl: "",
            durationSeconds: "",
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      },
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Add Video"
        subtitle="Import a video to the Learn library"
      />

      <div className="px-4 space-y-5 pb-4">
        {/* Source type */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Source</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setForm((f) => ({ ...f, sourceType: "youtube" }))}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                form.sourceType === "youtube" ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
              }`}
              data-testid="source-youtube"
            >
              <Youtube size={16} />
              YouTube
            </button>
            <button
              onClick={() => setForm((f) => ({ ...f, sourceType: "other" }))}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                form.sourceType === "other" ? "bg-accent text-white" : "bg-muted text-muted-foreground"
              }`}
              data-testid="source-other"
            >
              <Film size={16} />
              Other
            </button>
          </div>
        </div>

        {/* URL */}
        <FormField label="Video URL" error={errors.url}>
          <input
            value={form.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={form.sourceType === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."}
            className={`w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 transition-all ${
              errors.url ? "ring-2 ring-destructive" : "ring-primary/30"
            }`}
            data-testid="input-video-url"
          />
        </FormField>

        {/* Thumbnail preview */}
        {form.thumbnailUrl && (
          <div className="rounded-xl overflow-hidden border border-border aspect-video bg-muted">
            <img src={form.thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Thumbnail URL */}
        <FormField label="Thumbnail URL (auto-filled for YouTube)">
          <input
            value={form.thumbnailUrl}
            onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all"
            data-testid="input-thumbnail-url"
          />
        </FormField>

        {/* Title */}
        <FormField label="Title" error={errors.title}>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Video title..."
            className={`w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 transition-all ${
              errors.title ? "ring-2 ring-destructive" : "ring-primary/30"
            }`}
            data-testid="input-video-title"
          />
        </FormField>

        {/* Description */}
        <FormField label="Description (optional)">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all resize-none"
            data-testid="input-video-description"
          />
        </FormField>

        {/* Category */}
        <FormField label="Category" error={errors.category}>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setForm((f) => ({ ...f, category: key }))}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all text-left px-3 ${
                  form.category === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                }`}
                data-testid={`cat-${key}`}
              >
                {label}
              </button>
            ))}
          </div>
        </FormField>

        {/* Duration */}
        <FormField label="Duration (seconds, optional)">
          <input
            type="number"
            value={form.durationSeconds}
            onChange={(e) => setForm((f) => ({ ...f, durationSeconds: e.target.value }))}
            placeholder="e.g. 720"
            className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 transition-all"
            data-testid="input-duration"
          />
        </FormField>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={createVideo.isPending}
          className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm ${
            saved ? "bg-green-500 text-white" : "bg-primary text-white"
          } disabled:opacity-60`}
          data-testid="button-add-video"
        >
          {saved ? (
            <>
              <Check size={18} />
              Video Added to Library
            </>
          ) : createVideo.isPending ? (
            "Saving..."
          ) : (
            <>
              <Plus size={18} />
              Add to Library
            </>
          )}
        </button>

        <p className="text-center text-xs text-muted-foreground pb-2">
          Videos are added to the Learn section immediately.
        </p>
      </div>
    </Layout>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}
