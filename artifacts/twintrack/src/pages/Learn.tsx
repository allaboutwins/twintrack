import { useState } from "react";
import { useUser } from "@clerk/react";
import { FaInstagram, FaYoutube, FaFacebook, FaTiktok, FaPinterest } from "react-icons/fa";
import {
  useListVideos,
  useListBookmarkedVideos,
  useBookmarkVideo,
  useListVideoNotes,
  useUpsertVideoNote,
  getListVideosQueryKey,
  getListBookmarkedVideosQueryKey,
  getListVideoNotesQueryKey,
  useGetActivePoll,
  getGetActivePollQueryKey,
  useRespondToPoll,
  useGetPollHistory,
  getGetPollHistoryQueryKey,
  useSubmitFeedback,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Bookmark, BookmarkCheck, Search, Play, ExternalLink, StickyNote, Check, X, BookOpen, Sparkles, ChevronRight, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Magazine cover images
import coverJan24 from "@assets/Twins_Magazine_Jan._24_1778767835834.png";
import coverApr24 from "@assets/Twins_Magazine_Apr._2024_1778767835834.png";
import coverJul24 from "@assets/Twins_Magazine_Jul._24_1778767835834.png";
import coverNov24 from "@assets/Twins_Magazine_Nov._24_1778767835833.jpg";
import coverJan25 from "@assets/Twins_Magazine_Jan._2025_1778767835834.png";
import coverApr25 from "@assets/Twins_Magazine_Apr._25_1778767835834.png";
import coverJul25 from "@assets/Twins_Magazine_Jul._2025_1778767835833.jpg";
import coverNov25 from "@assets/Twins_Magazine_Nov._25__1778767835833.png";
import coverJan26 from "@assets/Twins_Magazine_Jan._26__1778767835834.png";
import coverApr26 from "@assets/Twins_Magazine_Apr._26_1778767835833.png";

// Magazine inside/index images
import insideJan24 from "@assets/Twins_Magazine_Jan._24_Inside_Issue_1778767835834.png";
import insideApr24 from "@assets/Twins_Magazine_Apr._24_Inside_1778767835834.png";
import insideJul24 from "@assets/Twins_Magazine_Jul._24_Inside_1778767835833.png";
import insideNov24 from "@assets/Twins_Magazine_Nov._24_Inside_1778767835834.jpg";
import insideJan25 from "@assets/Twins_Magazine_Jan._2025_-_Inside_1778767835834.png";
import insideApr25 from "@assets/Twins_Magazine_Apr._25_Inside_1778767835834.png";
import insideJul25 from "@assets/Twins_Magazine_Jul._2025_-_Inside_1778767835833.jpg";
import insideNov25 from "@assets/Twins_Magazine_Nov._25_-_What's_Inside_1778767835834.png";
import insideJan26 from "@assets/Twins_Magazine_Jan._26_Index_1778767835834.png";
import insideApr26 from "@assets/Twins_Magazine_Apr._26_Index_1778767835834.png";

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
  { name: "Instagram", handle: "@allaboutwins", url: "https://www.instagram.com/allaboutwins", color: "#fff", Icon: FaInstagram, bg: "#E1306C" },
  { name: "YouTube", handle: "All About Twins", url: "https://www.youtube.com/@AllAboutTwins", color: "#fff", Icon: FaYoutube, bg: "#FF0000" },
  { name: "Facebook", handle: "All About Twins", url: "https://tinyurl.com/m7efnvc8", color: "#fff", Icon: FaFacebook, bg: "#1877F2" },
  { name: "TikTok", handle: "@allabouttwins", url: "https://www.tiktok.com/@allabouttwins", color: "#fff", Icon: FaTiktok, bg: "#000000" },
  { name: "Pinterest", handle: "allabout2wins", url: "https://www.pinterest.com/allabout2wins", color: "#fff", Icon: FaPinterest, bg: "#E60023" },
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

// Magazine data — static curated list with real cover + inside images
const MAGAZINES = [
  { id: 1,  issue: "Jan / Feb 2024", season: "Winter 2024",  url: "https://tinyurl.com/TMJan2024",  cover: coverJan24,  inside: insideJan24 },
  { id: 2,  issue: "Apr / May 2024", season: "Spring 2024",  url: "https://tinyurl.com/4axxtxvf",   cover: coverApr24,  inside: insideApr24 },
  { id: 3,  issue: "Jul / Aug 2024", season: "Summer 2024",  url: "https://tinyurl.com/3f4kj2tz",   cover: coverJul24,  inside: insideJul24 },
  { id: 4,  issue: "Nov / Dec 2024", season: "Fall 2024",    url: "https://tinyurl.com/ku3uvkjn",   cover: coverNov24,  inside: insideNov24 },
  { id: 5,  issue: "Jan / Feb 2025", season: "Winter 2025",  url: "https://tinyurl.com/4rcee82w",   cover: coverJan25,  inside: insideJan25 },
  { id: 6,  issue: "Apr / May 2025", season: "Spring 2025",  url: "https://tinyurl.com/yaf8zm5v",   cover: coverApr25,  inside: insideApr25 },
  { id: 7,  issue: "Jul / Aug 2025", season: "Summer 2025",  url: "https://tinyurl.com/uy8mx53s",   cover: coverJul25,  inside: insideJul25 },
  { id: 8,  issue: "Nov / Dec 2025", season: "Fall 2025",    url: "https://tinyurl.com/j4wz9taa",   cover: coverNov25,  inside: insideNov25 },
  { id: 9,  issue: "Jan / Feb 2026", season: "Winter 2026",  url: "https://tinyurl.com/3962vvbn",   cover: coverJan26,  inside: insideJan26 },
  { id: 10, issue: "Apr / May 2026", season: "Spring 2026",  url: "https://tinyurl.com/3ujxz5vy",   cover: coverApr26,  inside: insideApr26 },
  { id: 11, issue: "Jul / Aug 2026", season: "Summer 2026",  url: "https://tinyurl.com/2yd3r8vz",   cover: null,        inside: null, gradient: "from-lime-400 to-green-500" },
] as const;

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

type Magazine = (typeof MAGAZINES)[number];

function MagazinePreviewModal({ mag, onClose }: { mag: Magazine; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="font-bold text-foreground">{mag.issue}</p>
            <p className="text-xs text-muted-foreground">{mag.season} · All About Twins Magazine</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-muted">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-4">
            {/* Cover */}
            {mag.cover && (
              <div className="rounded-2xl overflow-hidden shadow-md">
                <img src={mag.cover} alt={`${mag.issue} cover`} className="w-full object-cover" />
              </div>
            )}
            {/* Inside preview */}
            {mag.inside && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">What's Inside</p>
                <div className="rounded-2xl overflow-hidden shadow-sm border border-border">
                  <img src={mag.inside} alt={`${mag.issue} contents`} className="w-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-6 pt-3 border-t border-border flex-shrink-0">
          <a
            href={mag.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-sm active:scale-[0.98] transition-all shadow-sm"
            data-testid={`read-magazine-${mag.id}`}
          >
            <BookOpen size={16} />
            Read Full Issue
            <ExternalLink size={13} className="opacity-75" />
          </a>
        </div>
      </div>
    </div>
  );
}

function MagazineLibrary() {
  const [selected, setSelected] = useState<Magazine | null>(null);

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="bg-gradient-to-br from-primary/8 to-secondary/8 rounded-2xl border border-primary/15 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <BookOpen size={15} className="text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-wide">All About Twins Magazine</p>
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          Real stories, expert advice, and community from twin parents worldwide. Tap any issue to preview.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MAGAZINES.map((mag) => (
          <button
            key={mag.id}
            onClick={() => setSelected(mag)}
            className="block rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-all text-left w-full"
            data-testid={`magazine-${mag.id}`}
          >
            <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
              {mag.cover ? (
                <>
                  <img
                    src={mag.cover}
                    alt={`${mag.issue} cover`}
                    className="w-full h-full object-cover object-top"
                  />
                  {/* Subtle overlay with issue label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pt-8 pb-2.5 px-2.5">
                    <p className="text-white text-[10px] font-bold leading-tight">{mag.issue}</p>
                    <p className="text-white/70 text-[9px] uppercase tracking-wide">{mag.season}</p>
                  </div>
                </>
              ) : (
                /* Fallback gradient for issues without a cover yet */
                <div className={`w-full h-full bg-gradient-to-br ${"gradient" in mag ? mag.gradient : "from-gray-400 to-gray-600"} flex flex-col items-center justify-center p-4`}>
                  <div className="absolute top-0 left-0 right-0 bg-white/15 py-1.5 px-3 text-center">
                    <p className="text-[8px] font-black text-white uppercase tracking-widest">All About Twins</p>
                  </div>
                  <span className="text-4xl mt-4">👶👶</span>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/30 py-1.5 px-2.5 text-center">
                    <p className="text-[9px] font-semibold text-white">{mag.issue}</p>
                    <p className="text-[8px] text-white/70 uppercase tracking-wide">{mag.season}</p>
                  </div>
                </div>
              )}
              {/* Preview badge */}
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                  <ExternalLink size={9} className="text-white" />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border p-4 text-center space-y-1">
        <Sparkles size={18} className="text-primary mx-auto" />
        <p className="text-xs font-semibold text-foreground">More issues coming soon</p>
        <p className="text-xs text-muted-foreground">New editions added as they publish 💕</p>
      </div>

      {selected && (
        <MagazinePreviewModal mag={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

const ACADEMY_ARTICLES = [
  { emoji: "💤", title: "Syncing Twin Sleep Schedules", subtitle: "The #1 game-changer for twin families", badge: "Sleep", url: "https://allaboutwins.com/twin-sleep-schedule" },
  { emoji: "🍼", title: "Tandem Nursing: A Complete Guide", subtitle: "Feed both twins at once — step by step", badge: "Feeding", url: "https://allaboutwins.com/tandem-nursing" },
  { emoji: "🧠", title: "Managing Twin Parent Burnout", subtitle: "Signs, tools, and real recovery strategies", badge: "Mindset", url: "https://allaboutwins.com/twin-parent-burnout" },
  { emoji: "📅", title: "Building Your Daily Routine", subtitle: "Flexible structure that grows with your twins", badge: "Routines", url: "https://allaboutwins.com/twin-daily-routine" },
  { emoji: "🤰", title: "Twin Pregnancy: What to Expect", subtitle: "Hospital prep, NICU plan & home setup", badge: "Pregnancy", url: "https://allaboutwins.com/twin-pregnancy" },
  { emoji: "💛", title: "Navigating the NICU Journey", subtitle: "Support, milestones, and coming home", badge: "NICU", url: "https://allaboutwins.com/nicu-twins" },
];

const BADGE_COLORS: Record<string, string> = {
  Sleep: "bg-blue-100 text-blue-700",
  Feeding: "bg-rose-100 text-rose-700",
  Mindset: "bg-purple-100 text-purple-700",
  Routines: "bg-amber-100 text-amber-700",
  Pregnancy: "bg-green-100 text-green-700",
  NICU: "bg-yellow-100 text-yellow-700",
};

function AcademySection({ userId }: { userId: string }) {
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null);
  const [learnMore, setLearnMore] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submitFeedback = useSubmitFeedback();

  function submitSuggestion() {
    if (!learnMore.trim()) return;
    submitFeedback.mutate(
      {
        data: {
          userId: userId || null,
          feedbackType: "feature",
          message: `[Academy] ${learnMore}`,
          metadata: JSON.stringify({ section: "academy", helpful: feedback }),
        },
      },
      { onSuccess: () => setSubmitted(true), onError: () => setSubmitted(true) },
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4 pb-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-5 space-y-3">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1.5">🎓 Twins Academy</p>
          <h2 className="text-lg font-bold text-foreground mb-1.5">Your expert learning hub</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Curated guides and resources built specifically for twin parents — all in one place.
          </p>
        </div>
        <a
          href="https://allaboutwins.com/courses"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-all shadow-sm"
          data-testid="academy-browse-courses"
        >
          Browse Full Course Library <ExternalLink size={13} />
        </a>
      </div>

      {/* Article cards */}
      <div className="space-y-2.5">
        {ACADEMY_ARTICLES.map((article) => (
          <a
            key={article.title}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 p-4 bg-white rounded-2xl border border-border hover:bg-muted/20 active:bg-muted/40 transition-colors"
            data-testid={`academy-article-${article.badge.toLowerCase()}`}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center text-2xl flex-shrink-0">
              {article.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full mb-1 ${BADGE_COLORS[article.badge] ?? "bg-muted text-muted-foreground"}`}>
                {article.badge}
              </span>
              <p className="font-semibold text-sm text-foreground leading-snug">{article.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{article.subtitle}</p>
            </div>
            <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" />
          </a>
        ))}
      </div>

      {/* Feedback widget */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        {!submitted ? (
          <>
            <p className="font-semibold text-sm text-foreground">Was this section helpful? 🎓</p>
            <div className="flex gap-3">
              <button
                onClick={() => setFeedback("helpful")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  feedback === "helpful" ? "border-green-500 bg-green-50 text-green-700" : "border-border bg-muted text-foreground"
                }`}
                data-testid="academy-feedback-helpful"
              >
                👍 Yes!
              </button>
              <button
                onClick={() => setFeedback("not-helpful")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  feedback === "not-helpful" ? "border-red-400 bg-red-50 text-red-700" : "border-border bg-muted text-foreground"
                }`}
                data-testid="academy-feedback-not-helpful"
              >
                👎 Not really
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">What would you love to learn more about?</p>
              <textarea
                value={learnMore}
                onChange={(e) => setLearnMore(e.target.value)}
                placeholder="e.g. 'Sleep regression with twins', 'Returning to work as a twin mom'..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm outline-none focus:ring-2 ring-primary/30 resize-none placeholder:text-muted-foreground"
                data-testid="academy-learn-more-input"
              />
              <button
                onClick={submitSuggestion}
                disabled={!learnMore.trim() || submitFeedback.isPending}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
                data-testid="academy-submit-suggestion"
              >
                Send Suggestion 💕
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-3xl mb-2">💕</p>
            <p className="font-bold text-foreground text-sm">Thank you for your feedback!</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your suggestion helps us build a better Academy for twin families.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

type PollOption = { key: string; label: string };
type PollBreakdown = { optionKey: string; count: number; percentage: number };
type PollResult = { totalResponses: number; breakdown: PollBreakdown[] };
type PollItem = {
  id: number;
  question: string;
  category: string;
  options: PollOption[];
  isActive: boolean;
  hasResponded: boolean;
  userOptionKey: string | null;
  results: PollResult | null;
  createdAt: string;
};

function PollCard({
  poll,
  userId,
  onVoted,
}: {
  poll: PollItem;
  userId: string;
  onVoted: (updated: PollItem) => void;
}) {
  const respondMutation = useRespondToPoll();
  const [localPoll, setLocalPoll] = useState(poll);

  function vote(optionKey: string) {
    if (localPoll.hasResponded || !userId) return;
    respondMutation.mutate(
      { id: localPoll.id, data: { userId, optionKey } },
      {
        onSuccess: (data) => {
          const updated = data as unknown as PollItem;
          setLocalPoll(updated);
          onVoted(updated);
        },
      },
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wide">{localPoll.category}</span>
        {localPoll.isActive && (
          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Live</span>
        )}
      </div>
      <div className="p-4 space-y-3">
        <p className="font-semibold text-sm text-foreground leading-snug">{localPoll.question}</p>
        {!localPoll.hasResponded ? (
          <div className="space-y-2">
            {localPoll.options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => vote(opt.key)}
                disabled={respondMutation.isPending}
                className="w-full text-left px-4 py-2.5 rounded-xl border-2 border-border bg-muted/30 text-sm font-medium hover:border-primary/40 hover:bg-primary/5 active:bg-primary/10 transition-all disabled:opacity-60"
                data-testid={`poll-option-${opt.key}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {localPoll.options.map((opt) => {
              const bd = localPoll.results?.breakdown.find((b) => b.optionKey === opt.key);
              const pct = bd?.percentage ?? 0;
              const isChosen = localPoll.userOptionKey === opt.key;
              return (
                <div key={opt.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${isChosen ? "text-primary" : "text-foreground"}`}>
                      {isChosen && <Check size={11} className="inline mr-1" />}
                      {opt.label}
                    </span>
                    <span className="font-bold text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isChosen ? "bg-primary" : "bg-muted-foreground/40"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground text-right pt-1">
              {localPoll.results?.totalResponses ?? 0} twin moms voted
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CommunityPollsSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: activePoll, isLoading: activePollLoading } = useGetActivePoll(
    { userId },
    { query: { enabled: !!userId, queryKey: getGetActivePollQueryKey({ userId }) } },
  );
  const { data: pollHistory = [], isLoading: historyLoading } = useGetPollHistory(
    { userId },
    { query: { enabled: !!userId, queryKey: getGetPollHistoryQueryKey({ userId }) } },
  );

  const pastPolls = (pollHistory as unknown as PollItem[]).filter((p) => !p.isActive);

  function handleVoted(updated: PollItem) {
    qc.invalidateQueries({ queryKey: getGetActivePollQueryKey({ userId }) });
    qc.invalidateQueries({ queryKey: getGetPollHistoryQueryKey({ userId }) });
  }

  return (
    <div className="px-4 pt-4 space-y-4 pb-4">
      {/* Active Poll */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={15} className="text-primary" />
          <p className="font-bold text-sm text-foreground">Twin Mom Poll</p>
        </div>
        {activePollLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : activePoll ? (
          <PollCard poll={activePoll as unknown as PollItem} userId={userId} onVoted={handleVoted} />
        ) : (
          <div className="bg-muted/30 rounded-2xl border border-border p-6 text-center">
            <p className="text-2xl mb-2">🗳️</p>
            <p className="font-semibold text-sm text-foreground">No active poll right now</p>
            <p className="text-xs text-muted-foreground mt-1">Check back soon for the next community poll!</p>
          </div>
        )}
      </div>

      {/* Poll History */}
      {!historyLoading && pastPolls.length > 0 && (
        <div>
          <p className="font-bold text-sm text-foreground mb-3">Past Polls</p>
          <div className="space-y-3">
            {pastPolls.map((poll) => (
              <PollCard key={poll.id} poll={poll} userId={userId} onVoted={handleVoted} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Learn() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "saved" | "magazines" | "academy" | "community">("magazines");

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
        {activeTab !== "magazines" && activeTab !== "community" && activeTab !== "academy" && (
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
      {showSearch && activeTab !== "magazines" && activeTab !== "community" && activeTab !== "academy" && (
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
          { key: "magazines", label: "📚 Magazine" },
          { key: "academy", label: "🎓 Academy" },
          { key: "community", label: "🌐 Community" },
          { key: "library", label: "▶️ Videos" },
          { key: "saved", label: `🔖 Saved${bookmarked.length > 0 ? ` (${bookmarked.length})` : ""}` },
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

      {/* Academy Tab */}
      {activeTab === "academy" && <AcademySection userId={user?.id ?? ""} />}

      {/* Community Tab */}
      {activeTab === "community" && (
        <div className="px-4 pt-4 space-y-4 pb-4">
          {/* Polls section */}
          <CommunityPollsSection userId={user?.id ?? ""} />

          {/* Divider */}
          <div className="border-t border-border pt-4" />

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
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: s.bg, color: s.color }}
                  >
                    <s.Icon size={20} />
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
      {activeTab !== "community" && activeTab !== "magazines" && activeTab !== "academy" && (
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
