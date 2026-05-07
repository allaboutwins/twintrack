import { useState } from "react";
import { useUser } from "@clerk/react";
import {
  useListVideos,
  useListBookmarkedVideos,
  useBookmarkVideo,
  getListVideosQueryKey,
  getListBookmarkedVideosQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout, { PageHeader } from "@/components/Layout";
import { Bookmark, BookmarkCheck, Search, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "sleep", label: "Sleep" },
  { key: "feeding", label: "Feeding" },
  { key: "pregnancy", label: "Pregnancy" },
  { key: "toddler", label: "Toddler" },
  { key: "day-in-the-life", label: "Day in Life" },
  { key: "tips", label: "Tips" },
];

function getYouTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export default function TwinsTV() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);

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

  return (
    <Layout>
      <PageHeader title="Twins TV" subtitle="Videos curated for twin families" />

      {/* Search */}
      <div className="px-4 pb-3">
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

      {/* Category filter */}
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

      <div className="px-4 space-y-3 pb-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        )}

        {!isLoading && videos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <p className="text-4xl mb-3">📺</p>
            <p>No videos found. Try a different search or category.</p>
          </div>
        )}

        {videos.map((video) => {
          const ytId = getYouTubeId(video.url);
          const isPlaying = playingId === video.id;
          const isBookmarked = bookmarkedIds.has(video.id);
          const catColor = CATEGORIES.find((c) => c.key === video.category)?.label;

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
                      {video.category.replace(/-/g, " ")}
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
    </Layout>
  );
}
