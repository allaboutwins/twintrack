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
import Layout from "@/components/Layout";
import { Bookmark, BookmarkCheck, Search, Play, ExternalLink, StickyNote, Check, X, BookOpen, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "sleep", label: "💤 Sleep" },
  { key: "feeding", label: "🍼 Feeding" },
  { key: "breastfeeding-twins", label: "🤱 Nursing" },
  { key: "twin-pregnancy", label: "🤰 Pregnancy" },
  { key: "toddler-life", label: "🧒 Toddler" },
  { key: "routines", label: "📋 Routines" },
  { key: "mental-health", label: "🧠 Mindset" },
  { key: "nicu", label: "💛 NICU" },
  { key: "schedules", label: "⏰ Schedules" },
  { key: "tips", label: "⚡ Twin Hacks" },
  { key: "day-in-the-life", label: "🎬 Day in Life" },
];

const SOCIAL_LINKS = [
  { name: "Instagram", handle: "@allaboutwins", url: "https://www.instagram.com/allaboutwins", color: "#E1306C", icon: "IG", bg: "#fce4ec" },
  { name: "YouTube", handle: "All About Twins", url: "https://www.youtube.com/@AllAboutTwins", color: "#FF0000", icon: "YT", bg: "#ffebee" },
  { name: "Facebook", handle: "All About Twins", url: "https://tinyurl.com/m7efnvc8", color: "#1877F2", icon: "FB", bg: "#e3f2fd" },
  { name: "TikTok", handle: "@allabouttwins", url: "https://www.tiktok.com/@allabouttwins", color: "#000000", icon: "TK", bg: "#f3e5f5" },
  { name: "Pinterest", handle: "allabout2wins", url: "https://www.pinterest.com/allabout2wins", color: "#E60023", icon: "PT", bg: "#fce4ec" },
];

const TIPS = [
  "Syncing your twins' schedules is the single biggest life-changer. Even 15 minutes of difference adds up.",
  "It's okay if one twin eats more. Appetite naturally varies — just keep tracking.",
  "Tandem nursing saves 1–2 hours a day. A twin nursing pillow is worth every penny.",
  "White noise mimics the womb and helps both twins sleep through the other waking.",
  "You don't have to do everything perfectly. Good enough parenting is genuinely good parenting.",
  "Twin toddlers learn so much from watching each other. Parallel play is healthy and intentional.",
  "Batch your diaper changes: if one needs it, always check the other too.",
];

function getDayTip() {
  return TIPS[new Date().getDate() % TIPS.length];
}

// Magazine data — static curated list
const MAGAZINES = [
  { id: 1, issue: "Jan / Feb 2024", season: "Winter 2024", url: "https://tinyurl.com/TMJan2024", gradient: "from-rose-400 to-pink-600" },
  { id: 2, issue: "Apr / May 2024", season: "Spring 2024", url: "https://tinyurl.com/4axxtxvf", gradient: "from-violet-400 to-purple-600" },
  { id: 3, issue: "Jul / Aug 2024", season: "Summer 2024", url: "https://tinyurl.com/3f4kj2tz", gradient: "from-amber-400 to-orange-500" },
  { id: 4, issue: "Nov / Dec 2024", season: "Fall 2024", url: "https://tinyurl.com/ku3uvkjn", gradient: "from-teal-400 to-cyan-600" },
  { id: 5, issue: "Jan / Feb 2025", season: "Winter 2025", url: "https://tinyurl.com/4rcee82w", gradient: "from-blue-400 to-indigo-600" },
  { id: 6, issue: "Apr / May 2025", season: "Spring 2025", url: "https://tinyurl.com/yaf8zm5v", gradient: "from-emerald-400 to-green-600" },
  { id: 7, issue: "Jul / Aug 2025", season: "Summer 2025", url: "https://tinyurl.com/uy8mx53s", gradient: "from-yellow-400 to-amber-500" },
  { id: 8, issue: "Nov / Dec 2025", season: "Fall 2025", url: "https://tinyurl.com/j4wz9taa", gradient: "from-red-400 to-rose-600" },
  { id: 9, issue: "Jan / Feb 2026", season: "Winter 2026", url: "https://tinyurl.com/3962vvbn", gradient: "from-sky-400 to-blue-600" },
  { id: 10, issue: "Apr / May 2026", season: "Spring 2026", url: "https://tinyurl.com/3ujxz5vy", gradient: "from-fuchsia-400 to-pink-600" },
  { id: 11, issue: "Jul / Aug 2026", season: "Summer 2026", url: "https://tinyurl.com/2yd3r8vz", gradient: "from-lime-400 to-green-500" },
];

function getYouTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function getEmbedUrl(url: string) {
  const id = getYouTubeId(url);
  if (!id) return url;
  const origin = encodeURIComponent(window.location.origin);
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&origin=${origin}`;
}

function isYouTubeShorts(url: string) {
  return url.includes("/shorts/");
}

function getThumbnail(video: { url: string; thumbnailUrl?: string | null }) {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  const id = getYouTubeId(video.url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function VideoNotePanel({ videoId, userId }: { videoId: number; userId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: notes = [] } = useListVideoNotes(
    videoId,
    { userId },
    { query: { queryKey: getListVideoNotesQueryKey(videoId, { userId }) } },
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
          qc.invalidateQueries({ queryKey: getListVideoNotesQueryKey(videoId, { userId }) });
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
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <StickyNote size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{existingNote.note}</p>
          </div>
          <button onClick={startEdit} className="text-xs text-amber-600 font-semibold flex-shrink-0">
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. 'Try this tonight' or 'Worked great for Twin B'"
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
        <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-muted text-muted-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

function MagazineLibrary() {
  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="bg-gradient-to-br from-primary/8 to-secondary/8 rounded-2xl border border-primary/15 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <BookOpen size={15} className="text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Twins Magazine</p>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          The original twin parenting magazine — curated articles, expert advice, and real twin family stories.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MAGAZINES.map((mag) => (
          <a
            key={mag.id}
            href={mag.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-all"
            data-testid={`magazine-${mag.id}`}
          >
            {/* Cover */}
            <div className={`relative aspect-[3/4] bg-gradient-to-br ${mag.gradient} flex flex-col items-center justify-center p-4`}>
              {/* Masthead */}
              <div className="absolute top-0 left-0 right-0 bg-white/20 backdrop-blur-sm py-2 px-3 text-center">
                <p className="text-[9px] font-black text-white uppercase tracking-widest">Twins</p>
                <p className="text-[6px] font-bold text-white/80 uppercase tracking-widest">magazine</p>
              </div>
              {/* Centered content */}
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
                  <span className="text-2xl">👶👶</span>
                </div>
                <div className="text-center">
                  <p className="text-white text-[11px] font-bold leading-tight">{mag.issue}</p>
                </div>
              </div>
              {/* Season badge */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm py-1.5 px-3 text-center">
                <p className="text-[9px] font-semibold text-white uppercase tracking-wide">{mag.season}</p>
              </div>
              {/* Open indicator */}
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                  <ExternalLink size={9} className="text-white" />
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border p-4 text-center space-y-1">
        <Sparkles size={18} className="text-primary mx-auto" />
        <p className="text-xs font-semibold text-foreground">More issues coming soon</p>
        <p className="text-xs text-muted-foreground">New editions added as they publish 💕</p>
      </div>
    </div>
  );
}

export default function Learn() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "saved" | "magazines" | "community">("library");

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

  type VideoItem = (typeof videos)[number];
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);

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
  const featuredVideo = displayVideos[0] ?? null;
  const gridVideos = displayVideos.slice(1);

  return (
    <Layout>
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Learn</h1>
          <p className="text-sm text-muted-foreground">Your twin parenting library</p>
        </div>
        {activeTab !== "magazines" && activeTab !== "community" && (
          <button
            onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearch(""); }}
            className={`p-2.5 rounded-xl transition-all ${showSearch ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            data-testid="toggle-search"
          >
            <Search size={17} />
          </button>
        )}
      </div>

      {/* Search */}
      {showSearch && activeTab !== "magazines" && activeTab !== "community" && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-2.5 shadow-sm">
            <Search size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos..."
              className="flex-1 text-sm outline-none bg-transparent"
              autoFocus
              data-testid="input-video-search"
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2 border-b border-border overflow-x-auto no-scrollbar">
        {[
          { key: "library", label: "Videos" },
          { key: "saved", label: `Saved${bookmarked.length > 0 ? ` (${bookmarked.length})` : ""}` },
          { key: "magazines", label: "📚 Magazine" },
          { key: "community", label: "Community" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}
            data-testid={`tab-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Magazine Tab */}
      {activeTab === "magazines" && <MagazineLibrary />}

      {/* Community Tab */}
      {activeTab === "community" && (
        <div className="px-4 pt-4 space-y-4 pb-4">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border border-primary/20 p-5">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1.5">💡 Tip of the Day</p>
            <p className="text-sm text-foreground leading-relaxed">{getDayTip()}</p>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5 text-center space-y-1.5">
            <p className="text-2xl">✨</p>
            <p className="font-bold text-foreground">You're doing amazing.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Raising twins is one of the hardest and most extraordinary things a parent can do.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="font-semibold text-foreground">Follow All About Twins</p>
              <p className="text-xs text-muted-foreground mt-0.5">Connect with us everywhere</p>
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
          <p className="text-center text-xs text-muted-foreground italic pb-2">
            "Twins don't just double the love — they multiply it forever."
          </p>
        </div>
      )}

      {/* Library / Saved */}
      {activeTab !== "community" && activeTab !== "magazines" && (
        <div className="pb-6">
          {/* Category pills */}
          {activeTab === "library" && (
            <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    activeCategory === key
                      ? "bg-primary text-white shadow-sm"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`category-${key || "all"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="px-4 space-y-4">
              <Skeleton className="h-52 w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="aspect-[9/16] rounded-2xl" />
                <Skeleton className="aspect-[9/16] rounded-2xl" />
                <Skeleton className="aspect-[9/16] rounded-2xl" />
                <Skeleton className="aspect-[9/16] rounded-2xl" />
              </div>
            </div>
          )}

          {/* Empty */}
          {!isLoading && displayVideos.length === 0 && (
            <div className="text-center py-16 px-6">
              <p className="text-4xl mb-3">{activeTab === "saved" ? "🔖" : "📚"}</p>
              <p className="font-semibold text-foreground mb-1">
                {activeTab === "saved" ? "No saved videos yet" : "No videos found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeTab === "saved"
                  ? "Tap the bookmark icon on any video."
                  : "Try a different search or category."}
              </p>
            </div>
          )}

          {/* Content */}
          {!isLoading && displayVideos.length > 0 && (
            <>
              {/* Featured hero */}
              {featuredVideo && (
                <div className="px-4 mb-5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                    {activeTab === "saved" ? "⭐ Recently Saved" : "🔥 Featured"}
                  </p>
                  <div
                    onClick={() => setPlayingVideo(featuredVideo)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setPlayingVideo(featuredVideo)}
                    className="w-full relative rounded-2xl overflow-hidden cursor-pointer group active:scale-[0.99] transition-all shadow-md"
                    data-testid={`play-featured-${featuredVideo.id}`}
                  >
                    <div className="relative aspect-video bg-slate-900">
                      {getThumbnail(featuredVideo) ? (
                        <img
                          src={getThumbnail(featuredVideo)!}
                          alt={featuredVideo.title}
                          className="w-full h-full object-cover opacity-90"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                          <Play size={26} className="text-white ml-1" fill="white" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <span className="bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow">
                          {CATEGORIES.find((c) => c.key === featuredVideo.category)?.label ?? featuredVideo.category}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(featuredVideo.id); }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
                        data-testid={`bookmark-featured-${featuredVideo.id}`}
                      >
                        {bookmarkedIds.has(featuredVideo.id) ? (
                          <BookmarkCheck size={15} className="text-primary fill-primary" />
                        ) : (
                          <Bookmark size={15} className="text-white" />
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
                        <p className="text-white font-bold text-[15px] leading-snug">{featuredVideo.title}</p>
                        {featuredVideo.description && (
                          <p className="text-white/65 text-xs mt-1 line-clamp-1">{featuredVideo.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid */}
              {gridVideos.length > 0 && (
                <div className="px-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                    {activeTab === "saved" ? "All Saved" : "More Shorts"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {gridVideos.map((video) => {
                      const thumb = getThumbnail(video);
                      const isBookmarked = bookmarkedIds.has(video.id);
                      const catLabel = CATEGORIES.find((c) => c.key === video.category)?.label ?? video.category;
                      return (
                        <div
                          key={video.id}
                          className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-sm"
                          data-testid={`video-card-${video.id}`}
                        >
                          <button
                            className="w-full aspect-[9/16] relative block"
                            onClick={() => setPlayingVideo(video)}
                            data-testid={`play-video-${video.id}`}
                          >
                            {thumb ? (
                              <img src={thumb} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                                <Play size={18} className="text-white ml-0.5" fill="white" />
                              </div>
                            </div>
                            <div className="absolute top-2 left-2">
                              <span className="text-[8px] font-bold bg-black/50 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-full leading-none">
                                {catLabel.replace(/^[^\s]+ /, "")}
                              </span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
                              <p className="text-white text-[11px] font-semibold leading-snug line-clamp-3">
                                {video.title}
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => toggleBookmark(video.id)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                            data-testid={`bookmark-video-${video.id}`}
                          >
                            {isBookmarked ? (
                              <BookmarkCheck size={13} className="text-primary fill-primary" />
                            ) : (
                              <Bookmark size={13} className="text-white" />
                            )}
                          </button>
                          {user?.id && (
                            <div className="px-2 pb-2 bg-slate-900">
                              <VideoNotePanel videoId={video.id} userId={user.id} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/75" onClick={() => setPlayingVideo(null)} />
          <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl overflow-hidden flex flex-col max-h-[95dvh]">
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
              data-testid="close-player"
            >
              <X size={16} className="text-white" />
            </button>

            {(() => {
              const shorts = isYouTubeShorts(playingVideo.url);
              return (
                <div
                  className="bg-black flex-shrink-0 relative w-full"
                  style={{ paddingTop: shorts ? "min(65dvh, calc(100% * 16 / 9))" : "56.25%" }}
                >
                  <iframe
                    src={getEmbedUrl(playingVideo.url)}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture; accelerometer; gyroscope"
                    allowFullScreen
                    title={playingVideo.title}
                  />
                </div>
              );
            })()}

            <div className="overflow-y-auto flex-1">
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground leading-snug">{playingVideo.title}</p>
                    {playingVideo.description && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{playingVideo.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleBookmark(playingVideo.id)}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-border flex items-center justify-center"
                    data-testid={`bookmark-player-${playingVideo.id}`}
                  >
                    {bookmarkedIds.has(playingVideo.id) ? (
                      <BookmarkCheck size={18} className="text-primary fill-primary" />
                    ) : (
                      <Bookmark size={18} className="text-muted-foreground" />
                    )}
                  </button>
                </div>
                {user?.id && <VideoNotePanel videoId={playingVideo.id} userId={user.id} />}
                <a
                  href={playingVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                  data-testid="open-youtube"
                >
                  <ExternalLink size={13} />
                  Open in YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
