import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { posthog } from "@/lib/posthog";
import { trackPlanEvent } from "@/hooks/usePlan";
import { FaInstagram, FaYoutube, FaFacebook, FaTiktok, FaPinterest } from "react-icons/fa";
import {
  useGetActivePoll,
  getGetActivePollQueryKey,
  useRespondToPoll,
  useGetPollHistory,
  getGetPollHistoryQueryKey,
  useSubmitFeedback,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { ExternalLink, Check, X, BookOpen, Sparkles, ChevronRight, BarChart3, MessageCircle, ThumbsUp, Send, ChevronDown, ChevronUp } from "lucide-react";
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
import coverComingSoon from "@assets/Twins_Magazine_Coming_Soon_1780305570036.png";

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
  { id: 11, issue: "Jul / Aug 2026", season: "Summer 2026",  url: "https://tinyurl.com/2yd3r8vz",   cover: coverComingSoon, inside: null },
] as const;


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
            onClick={() => trackPlanEvent("magazine_read", { issueId: mag.id, issue: mag.issue, season: mag.season })}
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
            onClick={() => {
              posthog?.capture("magazine_opened", { issue: mag.id });
              trackPlanEvent("magazine_opened", { issueId: mag.id, issue: mag.issue, season: mag.season });
              setSelected(mag);
            }}
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

const ACADEMY_COURSES = [
  {
    emoji: "😴",
    title: "Helping Twins Sleep Tight – Giving Twin Parents Their Nights Back",
    subtitle: "Practical, proven strategies to help both twins sleep — so you can too",
    badge: "Sleep",
    url: "https://allaboutwins.com/courses/helping-twins-sleep-tight/lesson/my-journey",
  },
  {
    emoji: "🤱",
    title: "A Guide to Breastfeeding Your Twins at Home",
    subtitle: "Everything from hospital packing to tandem feeding and building supply at home",
    badge: "Feeding",
    url: "https://allaboutwins.com/courses/a-guide-to-breastfeeding-twins-at-home/lesson/hospital-packing-list-for-breastfeeding-twins",
  },
  {
    emoji: "🌙",
    title: "Sleep, Milestones & Real-Life Insights",
    subtitle: "3 evidence-based tips for twin sleep, plus real milestones to look forward to",
    badge: "Sleep",
    url: "https://allaboutwins.com/courses/sleep-milestones-real-life-insights/lesson/3-tips-for-twins-sleep",
  },
  {
    emoji: "⚖️",
    title: "Mastering Twins Sleep & Balance",
    subtitle: "When to sleep train, how to balance two schedules, and reclaim your evenings",
    badge: "Sleep",
    url: "https://allaboutwins.com/courses/twins-sleep-balance/lesson/when-is-the-best-time-to-sleep-train",
  },
  {
    emoji: "💪",
    title: "Postpartum Fitness for Twin Moms",
    subtitle: "Safe, realistic fitness for twin moms — from 13 months postpartum and beyond",
    badge: "Fitness",
    url: "https://allaboutwins.com/courses/postpartum-fitness-for-twin-moms/lesson/13-months-postpartum",
  },
  {
    emoji: "🍼",
    title: "Essential Tips for Breastfeeding Twins",
    subtitle: "Key breastfeeding strategies specifically for twin families",
    badge: "Feeding",
    url: "https://allaboutwins.com/courses/tips-for-breastfeeding-twins/lesson/who-am-i-2",
  },
  {
    emoji: "🎓",
    title: "Essential Twins Parents Guide with Principal Lisa",
    subtitle: "Expert parenting guidance from an educator who truly understands twin families",
    badge: "Parenting",
    url: "https://allaboutwins.com/courses/twins-parents-guide-with-principal-lisa/lesson/who-am-i",
  },
  {
    emoji: "🥗",
    title: "The Ultimate Guide for Postpartum Nutrition & Breastfeeding Twins",
    subtitle: "How to nourish yourself while breastfeeding two — nutrition that actually works",
    badge: "Nutrition",
    url: "https://allaboutwins.com/courses/postpartum-nutrition-breastfeeding-twins/lesson/how-im-preparing-to-breastfeed-twins",
  },
];

const BADGE_COLORS: Record<string, string> = {
  Sleep: "bg-blue-100 text-blue-700",
  Feeding: "bg-rose-100 text-rose-700",
  Mindset: "bg-purple-100 text-purple-700",
  Routines: "bg-amber-100 text-amber-700",
  Pregnancy: "bg-green-100 text-green-700",
  NICU: "bg-yellow-100 text-yellow-700",
  Fitness: "bg-orange-100 text-orange-700",
  Parenting: "bg-violet-100 text-violet-700",
  Nutrition: "bg-green-100 text-green-700",
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
          onClick={() => trackPlanEvent("academy_browse_clicked")}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white text-sm font-bold active:scale-[0.98] transition-all shadow-sm"
          data-testid="academy-browse-courses"
        >
          Browse Full Course Library <ExternalLink size={13} />
        </a>
      </div>

      {/* Course cards */}
      <div className="space-y-3">
        {ACADEMY_COURSES.map((course, idx) => (
          <a
            key={course.title}
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackPlanEvent("academy_course_clicked", { courseTitle: course.title, courseBadge: course.badge, idx })}
            className="block bg-white rounded-2xl border border-border overflow-hidden hover:border-primary/30 active:scale-[0.99] transition-all shadow-sm"
            data-testid={`academy-course-${course.badge.toLowerCase()}`}
          >
            <div className="flex items-stretch">
              {/* Thumbnail strip */}
              <div className="w-[72px] flex-shrink-0 flex flex-col items-center justify-center gap-1 text-white text-3xl py-4"
                style={{ background: idx % 2 === 0 ? "linear-gradient(135deg, #da5a9f, #b8459c)" : "linear-gradient(135deg, #2e818c, #246b75)" }}>
                {course.emoji}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 px-3.5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${BADGE_COLORS[course.badge] ?? "bg-muted text-muted-foreground"}`}>
                    {course.badge}
                  </span>
                  <ExternalLink size={10} className="text-muted-foreground/50" />
                </div>
                <p className="font-bold text-sm text-foreground leading-snug">{course.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{course.subtitle}</p>
              </div>
              <div className="flex items-center pr-3.5 flex-shrink-0">
                <ChevronRight size={15} className="text-muted-foreground" />
              </div>
            </div>
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

// ── Community Questions ──────────────────────────────────────────────────

type CommunityAnswer = {
  id: number;
  answerText: string;
  authorName: string | null;
  likes: number;
  isPinned: boolean;
  createdAt: string;
  likedByMe?: boolean;
};

type CommunityQuestion = {
  id: number;
  question: string;
  authorName: string | null;
  isAdminAdded: boolean;
  createdAt: string;
  answers: CommunityAnswer[];
};

function CommunityQuestionsSection({ userId }: { userId: string }) {
  const [questions, setQuestions] = useState<CommunityQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<number, string>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState<number | null>(null);
  const [showAskForm, setShowAskForm] = useState(false);
  const [myQuestion, setMyQuestion] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [likedAnswers, setLikedAnswers] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/community/questions")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setQuestions(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function submitQuestion() {
    if (!myQuestion.trim()) return;
    setSubmittingQuestion(true);
    try {
      await fetch("/api/community/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, question: myQuestion.trim(), authorName: "Twin Parent" }),
      });
      setQuestionSubmitted(true);
      setMyQuestion("");
      posthog?.capture("community_question_submitted");
    } finally {
      setSubmittingQuestion(false);
    }
  }

  async function submitAnswer(questionId: number) {
    const text = answerTexts[questionId]?.trim();
    if (!text) return;
    setSubmittingAnswer(questionId);
    try {
      const res = await fetch(`/api/community/questions/${questionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, answerText: text, authorName: "Twin Parent" }),
      });
      const newAnswer = await res.json() as CommunityAnswer;
      setQuestions((prev) => prev.map((q) =>
        q.id === questionId ? { ...q, answers: [...q.answers, newAnswer] } : q
      ));
      setAnswerTexts((prev) => ({ ...prev, [questionId]: "" }));
      posthog?.capture("community_answer_submitted");
    } finally {
      setSubmittingAnswer(null);
    }
  }

  async function likeAnswer(answerId: number) {
    if (!userId) return;
    const alreadyLiked = likedAnswers.has(answerId);
    setLikedAnswers((prev) => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(answerId) : next.add(answerId);
      return next;
    });
    setQuestions((prev) => prev.map((q) => ({
      ...q,
      answers: q.answers.map((a) =>
        a.id === answerId ? { ...a, likes: a.likes + (alreadyLiked ? -1 : 1) } : a
      ),
    })));
    await fetch(`/api/community/answers/${answerId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Community Questions</p>
        </div>
        <button
          onClick={() => { setShowAskForm((v) => !v); setQuestionSubmitted(false); }}
          className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/8 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
        >
          {showAskForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Ask a question
        </button>
      </div>

      {/* Ask form */}
      {showAskForm && (
        <div className="bg-white rounded-2xl border border-primary/20 p-4 space-y-3">
          {!questionSubmitted ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Share a question with the TwinTrack community. Questions are reviewed before publishing.
              </p>
              <textarea
                value={myQuestion}
                onChange={(e) => setMyQuestion(e.target.value)}
                placeholder="e.g. How do I sync my twins' nap schedules?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-muted text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
              />
              <button
                onClick={submitQuestion}
                disabled={submittingQuestion || !myQuestion.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Send size={13} />
                {submittingQuestion ? "Sending..." : "Submit Question"}
              </button>
            </>
          ) : (
            <div className="text-center py-2 space-y-1">
              <p className="text-2xl">💕</p>
              <p className="font-bold text-foreground text-sm">Thank you for your question!</p>
              <p className="text-xs text-muted-foreground">
                Based on feedback from TwinTrack families, we'll review and publish it soon.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Questions list */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-5 text-center space-y-1.5">
          <p className="text-2xl">💬</p>
          <p className="text-sm font-semibold text-foreground">No questions yet</p>
          <p className="text-xs text-muted-foreground">Be the first to ask the community something!</p>
        </div>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="bg-white rounded-2xl border border-border overflow-hidden">
            <button
              className="w-full px-4 py-4 text-left flex items-start gap-3"
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageCircle size={13} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {q.isAdminAdded && (
                    <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wide">Community Pick</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {q.answers.length} {q.answers.length === 1 ? "answer" : "answers"}
                  </span>
                </div>
                <p className="font-semibold text-sm text-foreground leading-snug">{q.question}</p>
              </div>
              {expandedId === q.id ? <ChevronUp size={15} className="text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown size={15} className="text-muted-foreground flex-shrink-0 mt-1" />}
            </button>

            {expandedId === q.id && (
              <div className="border-t border-border">
                {/* Answers */}
                {q.answers.length > 0 && (
                  <div className="divide-y divide-border/50">
                    {q.answers
                      .slice()
                      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.likes - a.likes)
                      .map((ans) => (
                        <div key={ans.id} className={`px-4 py-3 ${ans.isPinned ? "bg-primary/4" : ""}`}>
                          {ans.isPinned && (
                            <p className="text-[9px] font-bold text-primary uppercase tracking-wide mb-1.5">📌 Best Answer</p>
                          )}
                          <p className="text-sm text-foreground leading-relaxed">{ans.answerText}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-muted-foreground">{ans.authorName || "Twin Parent"}</span>
                            <button
                              onClick={() => likeAnswer(ans.id)}
                              className={`flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                                likedAnswers.has(ans.id) ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              <ThumbsUp size={11} />
                              {ans.likes > 0 ? ans.likes : "Helpful"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Answer input */}
                <div className="px-4 py-3 bg-muted/20 flex gap-2">
                  <input
                    value={answerTexts[q.id] ?? ""}
                    onChange={(e) => setAnswerTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && submitAnswer(q.id)}
                    placeholder="Share your experience..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-border text-sm outline-none focus:ring-2 ring-primary/30"
                  />
                  <button
                    onClick={() => submitAnswer(q.id)}
                    disabled={submittingAnswer === q.id || !answerTexts[q.id]?.trim()}
                    className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
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

  function handleVoted() {
    qc.invalidateQueries({ queryKey: getGetActivePollQueryKey({ userId }) });
    qc.invalidateQueries({ queryKey: getGetPollHistoryQueryKey({ userId }) });
  }

  const isLoading = activePollLoading || historyLoading;

  const historyPolls = pollHistory as unknown as PollItem[];
  const historyIds = new Set(historyPolls.map((p) => p.id));
  const activePollItem = activePoll ? (activePoll as unknown as PollItem) : null;

  const allPolls: PollItem[] = [
    ...(activePollItem && !historyIds.has(activePollItem.id) ? [activePollItem] : []),
    ...historyPolls,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={15} className="text-primary" />
        <p className="font-bold text-sm text-foreground">Community Polls</p>
        {allPolls.length > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {allPolls.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : allPolls.length === 0 ? (
        <div className="bg-muted/30 rounded-2xl border border-border p-8 text-center">
          <p className="text-3xl mb-3">🗳️</p>
          <p className="font-semibold text-sm text-foreground">No polls yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for the next community poll!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allPolls.map((poll) => (
            <PollCard key={poll.id} poll={poll} userId={userId} onVoted={handleVoted} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Learn() {
  const { user } = useUser();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"magazines" | "academy" | "community">(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "community") return "community";
      if (tab === "academy") return "academy";
    } catch { /* noop */ }
    return "magazines";
  });

  return (
    <Layout>
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <h1 className="text-xl font-bold text-foreground">Learn</h1>
        <p className="text-sm text-muted-foreground">Your twin parenting library</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3 flex gap-2 border-b border-border overflow-x-auto no-scrollbar">
        {[
          { key: "magazines", label: "📚 Magazine" },
          { key: "academy", label: "🎓 Academy" },
          { key: "community", label: "🌐 Community" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { posthog?.capture("learn_tab_clicked", { tab: key }); setActiveTab(key as typeof activeTab); }}
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
          {/* Community Questions */}
          <CommunityQuestionsSection userId={user?.id ?? ""} />

          {/* Divider */}
          <div className="border-t border-border pt-4" />

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

    </Layout>
  );
}
