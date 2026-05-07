import { useState } from "react";
import { useUser } from "@clerk/react";
import {
  useListVideos,
  useListBookmarkedVideos,
  useBookmarkVideo,
  getListVideosQueryKey,
  getListBookmarkedVideosQueryKey,
  useCreateVideo,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Bookmark, BookmarkCheck, Search, Play, ExternalLink, Star } from "lucide-react";
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
  { key: "tips", label: "Tips" },
  { key: "day-in-the-life", label: "Day in Life" },
];

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    handle: "@allaboutwins",
    url: "https://www.instagram.com/allaboutwins",
    color: "#E1306C",
    icon: "IG",
    bg: "#fce4ec",
  },
  {
    name: "YouTube",
    handle: "All About Twins",
    url: "https://www.youtube.com/@AllAboutTwins",
    color: "#FF0000",
    icon: "YT",
    bg: "#ffebee",
  },
  {
    name: "Facebook",
    handle: "All About Twins",
    url: "https://tinyurl.com/m7efnvc8",
    color: "#1877F2",
    icon: "FB",
    bg: "#e3f2fd",
  },
  {
    name: "TikTok",
    handle: "@allabouttwins",
    url: "https://www.tiktok.com/@allabouttwins",
    color: "#000000",
    icon: "TK",
    bg: "#f3e5f5",
  },
  {
    name: "Threads",
    handle: "@allaboutwins",
    url: "https://www.threads.net/@allaboutwins",
    color: "#1C1C1E",
    icon: "TH",
    bg: "#e8eaf6",
  },
  {
    name: "Pinterest",
    handle: "allabout2wins",
    url: "https://www.pinterest.com/allabout2wins",
    color: "#E60023",
    icon: "PT",
    bg: "#fce4ec",
  },
  {
    name: "LinkedIn",
    handle: "All About Twins",
    url: "https://tinyurl.com/y22925vn",
    color: "#0077B5",
    icon: "LI",
    bg: "#e1f5fe",
  },
];

const TIPS_OF_DAY = [
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
  const day = new Date().getDate();
  return TIPS_OF_DAY[day % TIPS_OF_DAY.length];
}

function getYouTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function getTwinAgeMonths(birthdate: string) {
  const bd = new Date(birthdate);
  const now = new Date();
  return (now.getFullYear() - bd.getFullYear()) * 12 + now.getMonth() - bd.getMonth();
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
          { key: "saved", label: "Saved" },
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
          {/* Tip of the day */}
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star size={16} className="text-primary fill-primary" />
              <p className="text-xs font-bold text-primary uppercase tracking-wide">Tip of the Day</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{getDayTip()}</p>
          </div>

          {/* You're doing amazing */}
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5 text-center space-y-2">
            <p className="text-2xl">✨</p>
            <p className="font-bold text-foreground">You're doing amazing.</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Raising twins is one of the hardest and most extraordinary things a parent can do. Every day you show up is a win.
            </p>
          </div>

          {/* Follow us */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="font-semibold text-foreground">Join our community</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect with twin families everywhere
              </p>
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

          {/* Encouragement quote */}
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground italic">
              "Twins don't just double the love — they multiply it forever."
            </p>
          </div>
        </div>
      )}

      {/* Library / Saved Tab */}
      {activeTab !== "community" && (
        <>
          {/* Search */}
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

          {/* Category filter */}
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

          <div className="px-4 space-y-3 pb-4">
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

              return (
                <div
                  key={video.id}
                  className="bg-white rounded-2xl border border-border overflow-hidden"
                  data-testid={`video-${video.id}`}
                >
                  {/* Thumbnail / Player */}
                  <div className="relative aspect-video bg-muted">
                    {isPlaying && ytId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
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
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play size={24} className="text-primary ml-1" fill="currentColor" />
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 capitalize">
                          {cat?.label ?? video.category.replace(/-/g, " ")}
                        </span>
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
