import { useState } from "react";
import { useUser } from "@clerk/react";
import {
  useListVideos,
  useListBookmarkedVideos,
  useBookmarkVideo,
  useListVideoNotes,
  useUpsertVideoNote,
  getListVideosQueryKey,
  getListBookmarkedVideosQueryKey,
  getListVideoNotesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Bookmark, BookmarkCheck, Search, Play, ExternalLink, Star, StickyNote, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "sleep", label: "Sleep" },
  { key: "feeding", label: "Feeding" },
  { key: "breastfeeding-twins", label: "Breastfeeding" },
  { key: "twin-pregnancy", label: "Pregnancy" },
  { key: "toddler-life", label: "Toddler Life" },
  { key: "routines", label: "Routines" },
  { key: "mental-health", label: "Mental Health" },
  { key: "nicu", label: "NICU Support" },
  { key: "premature-twins", label: "Premature Twins" },
  { key: "schedules", label: "Schedules" },
  { key: "expert-advice", label: "Expert Advice" },
  { key: "tips", label: "Twin Hacks" },
  { key: "day-in-the-life", label: "Day in Life" },
];

const SOCIAL_LINKS = [
  { name: "Instagram", handle: "@allaboutwins", url: "https://www.instagram.com/allaboutwins", color: "#E1306C", icon: "IG", bg: "#fce4ec" },
  { name: "YouTube", handle: "All About Twins", url: "https://www.youtube.com/@AllAboutTwins", color: "#FF0000", icon: "YT", bg: "#ffebee" },
  { name: "Facebook", handle: "All About Twins", url: "https://tinyurl.com/m7efnvc8", color: "#1877F2", icon: "FB", bg: "#e3f2fd" },
  { name: "TikTok", handle: "@allabouttwins", url: "https://www.tiktok.com/@allabouttwins", color: "#000000", icon: "TK", bg: "#f3e5f5" },
  { name: "Threads", handle: "@allaboutwins", url: "https://www.threads.net/@allaboutwins", color: "#1C1C1E", icon: "TH", bg: "#e8eaf6" },
  { name: "Pinterest", handle: "allabout2wins", url: "https://www.pinterest.com/allabout2wins", color: "#E60023", icon: "PT", bg: "#fce4ec" },
  { name: "LinkedIn", handle: "All About Twins", url: "https://tinyurl.com/y22925vn", color: "#0077B5", icon: "LI", bg: "#e1f5fe" },
];

const TIPS = [
  "Syncing your twins' schedules is the single biggest life-changer. Even 15 minutes of difference adds up to hours of lost sleep.",
  "It's okay if one twin eats more than the other. Appetite varies naturally — just keep tracking and share with your pediatrician.",
  "\"Sleeping when the babies sleep\" is real advice. Even 20 minutes makes a difference. You're doing an incredible job.",
  "Tandem nursing both twins at once can save you 1–2 hours a day. A twin nursing pillow is worth every penny.",
  "White noise is your best friend. It mimics the womb and helps block out the sound of the other twin waking.",
  "You don't have to do everything perfectly. Good enough parenting is genuinely good parenting. You are enough.",
  "Twin toddlers learn so much from watching each other. Parallel play is totally normal and healthy.",
  "Batch your diaper changes. If one twin needs a change, check the other too — it saves you another trip in 10 minutes.",
  "It gets easier. Every stage passes. The stage you're in right now is temporary, even if it doesn't feel like it.",
  "Celebrating small wins matters. Every feeding, every nap, every diaper — you're keeping two tiny humans alive and thriving.",
];

function getDayTip() {
  return TIPS[new Date().getDate() % TIPS.length];
}

function getYouTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function getEmbedUrl(url: string) {
  const id = getYouTubeId(url);
  if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
  return url;
}

function isYouTube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function VideoNotePanel({ videoId, userId }: { videoId: number; userId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: notes = [] } = useListVideoNotes(
    { id: videoId, userId },
    { query: { queryKey: getListVideoNotesQueryKey({ id: videoId, userId }) } },
  );

  const upsertNote = useUpsertVideoNote();
  const existingNote = notes[0];

  function startEdit() {
    setDraft(existingNote?.note ?? "");
    setEditing(true);
  }

  function saveNote() {
    upsertNote.mutate(
      { id: videoId, data: { userId, note: draft } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListVideoNotesQueryKey({ id: videoId, userId }) });
          setEditing(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  }

  if (!editing && !existingNote) {
    return (
      <button
        onClick={startEdit}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
        data-testid={`add-note-${videoId}`}
      >
        <StickyNote size={13} />
        Add a personal note
      </button>
    );
  }

  if (!editing && existingNote) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <StickyNote size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{existingNote.note}</p>
          </div>
          <button
            onClick={startEdit}
            className="text-xs text-amber-600 font-semibold flex-shrink-0 hover:text-amber-800"
            data-testid={`edit-note-${videoId}`}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. 'Try this bedtime routine tonight' or 'This feeding trick worked for Twin B'"
        rows={3}
        className="w-full px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs outline-none focus:ring-2 ring-amber-300 resize-none text-amber-900 placeholder:text-amber-400"
        autoFocus
        data-testid={`note-input-${videoId}`}
      />
      <div className="flex gap-2">
        <button
          onClick={saveNote}
          disabled={upsertNote.isPending || !draft.trim()}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            saved ? "bg-green-500 text-white" : "bg-primary text-white"
          } disabled:opacity-50`}
          data-testid={`save-note-${videoId}`}
        >
          {saved ? <Check size={12} /> : <StickyNote size={12} />}
          {saved ? "Saved!" : "Save Note"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-muted text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Learn() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "saved" | "community">("library");

  const { data: videos = [], isLoading } = useListVideos(
    { category: activeCategory || undefined, search: search || undefined },
    {
      query: {
        queryKey: getListVideosQueryKey({ category: activeCategory || undefined, search: search || undefined }),
      },
    },
  );

  const { data: bookmarked = [] } = useListBookmarkedVideos(
    { userId: user?.id ?? "" },
    { query: { enabled: !!user?.id, queryKey: getListBookmarkedVideosQueryKey({ userId: user?.id ?? "" }) } },
  );

  const bookmarkMutation = useBookmarkVideo();
  const bookmarkedIds = new Set(bookmarked.map((v) => v.id));

  function toggleBookmark(videoId: number) {
    if (!user?.id) return;
    const current = bookmarkedIds.has(videoId);
    bookmarkMutation.mutate(
      { id: videoId, data: { userId: user.id, bookmarked: !current } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListBookmarkedVideosQueryKey({ userId: user?.id ?? "" }) });
        },
      },
    );
  }

  const displayVideos = activeTab === "saved" ? bookmarked : videos;

  return (
    <Layout>
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-bold text-foreground">Learn</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your twin parenting library</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2 border-b border-border">
        {[
          { key: "library", label: "Library" },
          { key: "saved", label: `Saved${bookmarked.length > 0 ? ` (${bookmarked.length})` : ""}` },
          { key: "community", label: "Community" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}
            data-testid={`tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Community Tab */}
      {activeTab === "community" && (
        <div className="px-4 pt-4 space-y-5 pb-4">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star size={16} className="text-primary fill-primary" />
              <p className="text-xs font-bold text-primary uppercase tracking-wide">Tip of the Day</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{getDayTip()}</p>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5 text-center space-y-2">
            <p className="text-2xl">✨</p>
            <p className="font-bold text-foreground">You're doing amazing.</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Raising twins is one of the hardest and most extraordinary things a parent can do. Every day you show up is a win.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="font-semibold text-foreground">Join our community</p>
              <p className="text-xs text-muted-foreground mt-0.5">Connect with All About Twins everywhere</p>
            </div>
            <div className="divide-y divide-border">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors"
                  data-testid={`social-${s.name.toLowerCase()}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: s.bg, color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.handle}</p>
                  </div>
                  <ExternalLink size={14} className="text-muted-foreground flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground italic">"Twins don't just double the love — they multiply it forever."</p>
          </div>
        </div>
      )}

      {/* Library / Saved */}
      {activeTab !== "community" && (
        <>
          {activeTab === "library" && (
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-2.5">
                <Search size={16} className="text-muted-foreground flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search videos..."
                  className="flex-1 text-sm outline-none bg-transparent"
                  data-testid="input-video-search"
                />
              </div>
            </div>
          )}

          {activeTab === "library" && (
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    activeCategory === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`category-${key || "all"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="px-4 space-y-4 pb-4">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-52 rounded-2xl" />
                <Skeleton className="h-52 rounded-2xl" />
              </div>
            )}

            {!isLoading && displayVideos.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <p className="text-4xl mb-3">{activeTab === "saved" ? "🔖" : "📚"}</p>
                <p>
                  {activeTab === "saved"
                    ? "No saved videos yet. Tap the bookmark icon on any video."
                    : "No videos found. Try a different search or category."}
                </p>
              </div>
            )}

            {displayVideos.map((video) => {
              const ytId = getYouTubeId(video.url);
              const isPlaying = playingId === video.id;
              const isBookmarked = bookmarkedIds.has(video.id);
              const cat = CATEGORIES.find((c) => c.key === video.category);
              const ageLabel =
                video.ageRangeMin != null || video.ageRangeMax != null
                  ? video.ageRangeMin != null && video.ageRangeMax != null
                    ? `${video.ageRangeMin}–${video.ageRangeMax} months`
                    : video.ageRangeMin != null
                      ? `${video.ageRangeMin}+ months`
                      : `Up to ${video.ageRangeMax} months`
                  : null;

              return (
                <div
                  key={video.id}
                  className="bg-white rounded-2xl border border-border overflow-hidden"
                  data-testid={`video-${video.id}`}
                >
                  {/* Player */}
                  <div className="relative aspect-video bg-muted">
                    {isPlaying ? (
                      <iframe
                        src={getEmbedUrl(video.url)}
                        className="w-full h-full"
                        allow="autoplay; fullscreen"
                        title={video.title}
                      />
                    ) : (
                      <button
                        className="w-full h-full flex items-center justify-center relative group"
                        onClick={() => setPlayingId(video.id)}
                        data-testid={`play-video-${video.id}`}
                      >
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play size={24} className="text-primary ml-1" fill="currentColor" />
                          </div>
                        </div>
                        {ageLabel && (
                          <div className="absolute top-3 left-3">
                            <span className="bg-accent/90 text-white text-xs font-semibold px-2 py-1 rounded-full">
                              {ageLabel}
                            </span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                            {cat?.label ?? video.category.replace(/-/g, " ")}
                          </span>
                          {video.tags && video.tags.split(",").slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                        <p className="font-semibold text-foreground leading-snug">{video.title}</p>
                        {video.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleBookmark(video.id)}
                        className="p-2 flex-shrink-0 transition-colors"
                        data-testid={`bookmark-video-${video.id}`}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck size={20} className="text-primary fill-primary" />
                        ) : (
                          <Bookmark size={20} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Personal notes */}
                    {user?.id && <VideoNotePanel videoId={video.id} userId={user.id} />}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Layout>
  );
}
