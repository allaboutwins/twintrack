import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSaveOnboarding, getGetOnboardingQueryKey } from "@workspace/api-client-react";
import { Check } from "lucide-react";

type Step = "welcome" | "family" | "age" | "prematurity" | "journey" | "discovery" | "ambassador" | "newsletter" | "done";

interface FormState {
  parentStatus: string;
  multipleType: string;
  babyAgeGroup: string;
  isPremature: boolean | null;
  gestationalAgeWeeks: number | null;
  hadNicu: boolean | null;
  wantsAdjustedAge: boolean | null;
  biggestChallenge: string[];
  featureInterest: string[];
  discoverySource: string;
  instagramHandle: string;
  isAmbassador: boolean | null;
  email: string;
  newsletterConsent: boolean;
}

const CHALLENGES = [
  { key: "sleep", label: "😴 Sleep" },
  { key: "feeding", label: "🍼 Feeding" },
  { key: "routines", label: "📅 Routines" },
  { key: "pumping", label: "🤱 Pumping" },
  { key: "mental-load", label: "🧠 Mental load" },
  { key: "nicu", label: "🏥 NICU" },
  { key: "premature", label: "💛 Premature twins" },
  { key: "other", label: "💬 Other" },
];

const FEATURES = [
  { key: "sleep-tracker", label: "😴 Sleep tracking" },
  { key: "feeding-log", label: "🍼 Feeding tracking" },
  { key: "twin-ai", label: "✨ Twin AI" },
  { key: "milestones", label: "💕 Milestones" },
  { key: "community", label: "👯 Community polls" },
];

const DISCOVERY_SOURCES = [
  { key: "instagram", label: "📸 Instagram" },
  { key: "facebook", label: "👥 Facebook" },
  { key: "tiktok", label: "🎵 TikTok" },
  { key: "youtube", label: "▶️ YouTube" },
  { key: "threads", label: "🧵 Threads" },
  { key: "pinterest", label: "📌 Pinterest" },
  { key: "friend", label: "🤝 A friend told me" },
  { key: "allaboutwins", label: "🍒 All About Twins" },
  { key: "other", label: "💬 Other" },
];

function getSteps(parentStatus: string): Step[] {
  const steps: Step[] = ["welcome", "family"];
  if (parentStatus === "parenting") {
    steps.push("age");
    steps.push("prematurity");
  }
  steps.push("journey");
  steps.push("discovery");
  steps.push("ambassador");
  steps.push("newsletter");
  steps.push("done");
  return steps;
}

export default function OnboardingFlow({
  userId,
  userEmail = "",
  onComplete,
}: {
  userId: string;
  userEmail?: string;
  onComplete: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    parentStatus: "",
    multipleType: "",
    babyAgeGroup: "",
    isPremature: null,
    gestationalAgeWeeks: null,
    hadNicu: null,
    wantsAdjustedAge: null,
    biggestChallenge: [],
    featureInterest: [],
    discoverySource: "",
    instagramHandle: "",
    isAmbassador: null,
    email: userEmail,
    newsletterConsent: false,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const qc = useQueryClient();
  const saveOnboarding = useSaveOnboarding();

  const steps = getSteps(form.parentStatus);
  const currentStep = steps[stepIndex] ?? "welcome";
  const contentSteps = steps.filter((s): s is Exclude<Step, "welcome" | "done"> => s !== "welcome" && s !== "done");
  const contentStepIndex = (contentSteps as Step[]).indexOf(currentStep);
  const progress = contentStepIndex >= 0 ? ((contentStepIndex + 1) / contentSteps.length) * 100 : 0;

  function next() {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
  }
  function back() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function complete() {
    saveOnboarding.mutate(
      {
        userId,
        data: {
          parentStatus: form.parentStatus || null,
          multipleType: form.multipleType || null,
          babyAgeGroup: form.babyAgeGroup || null,
          isPremature: form.isPremature,
          gestationalAgeWeeks: form.gestationalAgeWeeks,
          hadNicu: form.hadNicu,
          wantsAdjustedAge: form.wantsAdjustedAge,
          biggestChallenge: form.biggestChallenge.length > 0 ? form.biggestChallenge.join(",") : null,
          featureInterest: form.featureInterest.length > 0 ? form.featureInterest.join(",") : null,
          discoverySource: form.discoverySource || null,
          instagramHandle: form.instagramHandle || null,
          isAmbassador: form.isAmbassador,
          email: form.email || null,
          newsletterConsent: form.newsletterConsent || null,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetOnboardingQueryKey(userId) });
          onComplete();
        },
        onError: onComplete,
      },
    );
  }

  const isLastContentStep = currentStep === "newsletter";

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col max-w-[430px] mx-auto overflow-hidden">
      {/* Progress bar */}
      {currentStep !== "welcome" && currentStep !== "done" && (
        <div className="h-1.5 bg-primary/10 flex-shrink-0">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* ── WELCOME ── */}
        {currentStep === "welcome" && (
          <div className="flex flex-col items-center justify-center min-h-full p-8 text-center bg-gradient-to-b from-primary/8 via-background to-accent/8">
            <div className="text-7xl mb-6" style={{ lineHeight: 1 }}>
              💕
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4 leading-tight">
              Welcome to
              <br />
              TwinTrack
            </h1>
            <div className="bg-white/90 border border-primary/20 rounded-2xl px-6 py-5 mb-8 text-left shadow-sm">
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">🍒 Founding Member</p>
              <p className="text-sm text-foreground leading-relaxed">
                You're one of our first founding twin moms — helping us build the most supportive app for twin parents
                together. Your voice shapes this product. 💕
              </p>
            </div>
            <button
              onClick={next}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-md active:scale-[0.98] transition-all"
              data-testid="onboarding-start"
            >
              Let's begin 🚀
            </button>
            <button onClick={onComplete} className="mt-4 text-xs text-muted-foreground underline">
              Skip for now
            </button>
          </div>
        )}

        {/* ── FAMILY ── */}
        {currentStep === "family" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("family") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">Tell us about your family 💕</h2>
              <p className="text-sm text-muted-foreground mt-1">Helps us tailor TwinTrack just for you.</p>
            </div>

            <div>
              <p className="font-semibold text-sm mb-3">Where are you in your journey?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "expecting", label: "🤰 Expecting multiples" },
                  { key: "parenting", label: "👶 Parenting multiples" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setForm((f) => ({ ...f, parentStatus: opt.key }))}
                    className={`p-4 rounded-2xl border-2 text-sm font-semibold text-left transition-all ${
                      form.parentStatus === opt.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-foreground"
                    }`}
                    data-testid={`status-${opt.key}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-sm mb-3">What kind of multiples?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "twins", label: "👯 Twins" },
                  { key: "triplets", label: "🌟 Triplets" },
                  { key: "quads", label: "🍀 Quads" },
                  { key: "other", label: "💫 Other" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setForm((f) => ({ ...f, multipleType: opt.key }))}
                    className={`p-3 rounded-2xl border-2 text-sm font-semibold transition-all ${
                      form.multipleType === opt.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-foreground"
                    }`}
                    data-testid={`multiple-${opt.key}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AGE ── */}
        {currentStep === "age" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("age") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">How old are your babies? 🐣</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "newborn", label: "🐣 Newborn", sub: "0 – 3 months" },
                { key: "infant", label: "🍼 Infant", sub: "3 – 12 months" },
                { key: "toddler", label: "🧒 Toddler", sub: "1 – 3 years" },
                { key: "older", label: "🌟 Older", sub: "3+ years" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setForm((f) => ({ ...f, babyAgeGroup: opt.key }))}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    form.babyAgeGroup === opt.key
                      ? "border-primary bg-primary/10"
                      : "border-border bg-white"
                  }`}
                  data-testid={`age-${opt.key}`}
                >
                  <p className={`text-sm font-bold ${form.babyAgeGroup === opt.key ? "text-primary" : "text-foreground"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PREMATURITY ── */}
        {currentStep === "prematurity" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("prematurity") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">Were your babies premature? 💛</h2>
              <p className="text-sm text-muted-foreground mt-1">We'll enable adjusted age tracking if helpful.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: true, label: "Yes, premature" },
                { val: false, label: "No, full term" },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  onClick={() => setForm((f) => ({ ...f, isPremature: opt.val }))}
                  className={`p-4 rounded-2xl border-2 text-sm font-semibold transition-all ${
                    form.isPremature === opt.val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white text-foreground"
                  }`}
                  data-testid={`premature-${opt.val}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.isPremature && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <p className="font-semibold text-sm mb-2">Gestational age at birth (weeks)</p>
                  <div className="flex flex-wrap gap-2">
                    {[23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36].map((w) => (
                      <button
                        key={w}
                        onClick={() => setForm((f) => ({ ...f, gestationalAgeWeeks: w }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                          form.gestationalAgeWeeks === w
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-white text-foreground"
                        }`}
                      >
                        {w}w
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-semibold text-sm mb-2">Were they in NICU?</p>
                    <div className="flex gap-2">
                      {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map((opt) => (
                        <button
                          key={String(opt.val)}
                          onClick={() => setForm((f) => ({ ...f, hadNicu: opt.val }))}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                            form.hadNicu === opt.val
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-white text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-2">Use adjusted age?</p>
                    <div className="flex gap-2">
                      {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map((opt) => (
                        <button
                          key={String(opt.val)}
                          onClick={() => setForm((f) => ({ ...f, wantsAdjustedAge: opt.val }))}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                            form.wantsAdjustedAge === opt.val
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-white text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── JOURNEY ── */}
        {currentStep === "journey" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("journey") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">What matters most to you? ✨</h2>
              <p className="text-sm text-muted-foreground mt-1">This guides how we grow TwinTrack.</p>
            </div>

            <div>
              <p className="font-semibold text-sm mb-3">What are your biggest challenges right now? <span className="text-muted-foreground font-normal">(pick all that apply)</span></p>
              <div className="flex flex-wrap gap-2">
                {CHALLENGES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setForm((f) => {
                      const arr = f.biggestChallenge.includes(c.key)
                        ? f.biggestChallenge.filter((k) => k !== c.key)
                        : [...f.biggestChallenge, c.key];
                      return { ...f, biggestChallenge: arr };
                    })}
                    className={`px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                      form.biggestChallenge.includes(c.key)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-foreground"
                    }`}
                    data-testid={`challenge-${c.key}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-sm mb-3">Which features interest you? <span className="text-muted-foreground font-normal">(pick all that apply)</span></p>
              <div className="flex flex-wrap gap-2">
                {FEATURES.map((feat) => (
                  <button
                    key={feat.key}
                    onClick={() => setForm((f) => {
                      const arr = f.featureInterest.includes(feat.key)
                        ? f.featureInterest.filter((k) => k !== feat.key)
                        : [...f.featureInterest, feat.key];
                      return { ...f, featureInterest: arr };
                    })}
                    className={`px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                      form.featureInterest.includes(feat.key)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-foreground"
                    }`}
                    data-testid={`feature-${feat.key}`}
                  >
                    {feat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DISCOVERY ── */}
        {currentStep === "discovery" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("discovery") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">How did you find TwinTrack? 🔍</h2>
              <p className="text-sm text-muted-foreground mt-1">Helps us reach more twin families!</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {DISCOVERY_SOURCES.map((src) => (
                <button
                  key={src.key}
                  onClick={() => setForm((f) => ({ ...f, discoverySource: src.key }))}
                  className={`p-3 rounded-2xl border-2 text-sm font-semibold text-left transition-all ${
                    form.discoverySource === src.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white text-foreground"
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>
            <div>
              <p className="font-semibold text-sm mb-2">Your Instagram handle <span className="text-muted-foreground font-normal">(optional)</span></p>
              <input
                type="text"
                placeholder="@yourusername"
                value={form.instagramHandle}
                onChange={(e) => setForm((f) => ({ ...f, instagramHandle: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white text-sm font-medium focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* ── AMBASSADOR ── */}
        {currentStep === "ambassador" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("ambassador") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">One last thing... 🍒</h2>
            </div>
            <div className="bg-gradient-to-br from-primary/8 to-accent/8 border border-primary/20 rounded-2xl p-5">
              <p className="text-2xl mb-3">💕</p>
              <h3 className="font-bold text-foreground text-base mb-2">Become a Founding Ambassador?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We're building TwinTrack with our community. As a Founding Ambassador, you'd get early access to new features,
                share feedback, and help other twin families find their footing.
              </p>
              <p className="text-xs text-primary font-semibold mt-2">No pressure — just love 🍒</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setForm((f) => ({ ...f, isAmbassador: true }))}
                className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${
                  form.isAmbassador === true
                    ? "border-primary bg-primary text-white"
                    : "border-primary/40 bg-white text-primary"
                }`}
                data-testid="ambassador-yes"
              >
                {form.isAmbassador === true && <Check size={16} className="inline mr-1" />}
                Yes! 💕 I'm in
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, isAmbassador: false }))}
                className={`p-4 rounded-2xl border-2 text-sm font-semibold transition-all ${
                  form.isAmbassador === false
                    ? "border-muted-foreground bg-muted text-muted-foreground"
                    : "border-border bg-white text-foreground"
                }`}
                data-testid="ambassador-no"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* ── NEWSLETTER ── */}
        {currentStep === "newsletter" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("newsletter") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">Stay in the loop 💌</h2>
            </div>
            <div className="bg-gradient-to-br from-primary/8 to-accent/8 border border-primary/20 rounded-2xl p-5">
              <p className="text-2xl mb-3">📬</p>
              <h3 className="font-bold text-foreground text-base mb-2">Twin parenting tips, right to your inbox</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Weekly tips, milestone reminders, and expert resources for twin parents — only the good stuff. No spam, ever. 💕
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-2">
                Your email address <span className="text-muted-foreground font-normal">(optional)</span>
              </p>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-white text-sm font-medium focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => setForm((f) => ({ ...f, newsletterConsent: !f.newsletterConsent }))}
              className={`flex items-center gap-3 w-full p-4 rounded-2xl border-2 text-left transition-all ${
                form.newsletterConsent
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-border bg-white text-foreground"
              }`}
              data-testid="newsletter-consent-toggle"
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  form.newsletterConsent ? "border-primary bg-primary" : "border-border"
                }`}
              >
                {form.newsletterConsent && <Check size={12} className="text-white" />}
              </div>
              <div>
                <p className="font-semibold text-sm">Yes! Send me twin parenting tips 💕</p>
                <p className="text-xs text-muted-foreground mt-0.5">You can unsubscribe anytime.</p>
              </div>
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {currentStep === "done" && (
          <div className="flex flex-col items-center justify-center min-h-full p-8 text-center bg-gradient-to-b from-primary/8 via-background to-accent/8">
            <div className="flex gap-2 text-5xl mb-5" style={{ lineHeight: 1 }}>
              <span>🎉</span><span>🍒</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">You're a Founding TwinTrack Mom!</h2>
            <p className="text-primary font-bold text-base mb-2">💕 Thank you for being here.</p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
              We'll use your answers to shape TwinTrack for families like yours. Every response makes this better.
            </p>

            <div className="bg-white/90 border border-primary/20 rounded-2xl px-5 py-4 mb-6 w-full text-left shadow-sm">
              <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">Suggested first steps</p>
              <div className="space-y-2.5">
                {["Add your twins' profiles in Settings", "Log today's first feeding or sleep", "Explore twin parenting Shorts in Learn 🎓"].map(
                  (item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-foreground">
                      <div className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>

            <button
              onClick={complete}
              disabled={saveOnboarding.isPending}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-md active:scale-[0.98] transition-all disabled:opacity-70"
              data-testid="onboarding-complete"
            >
              {saveOnboarding.isPending ? "Saving..." : "Start Tracking 🚀"}
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav buttons — not on welcome or done */}
      {currentStep !== "welcome" && currentStep !== "done" && (
        <div className="p-4 border-t border-border bg-white flex gap-3 flex-shrink-0 safe-area-pb">
          {stepIndex > 1 && (
            <button
              onClick={back}
              className="flex-1 py-3.5 rounded-xl border-2 border-border text-sm font-semibold text-foreground active:bg-muted/50 transition-all"
              data-testid="onboarding-back"
            >
              ← Back
            </button>
          )}
          <button
            onClick={next}
            disabled={
              (currentStep === "family" && (!form.parentStatus || !form.multipleType)) ||
              (currentStep === "age" && !form.babyAgeGroup) ||
              (currentStep === "prematurity" && form.isPremature === null) ||
              (currentStep === "discovery" && !form.discoverySource)
            }
            className="flex-[2] py-3.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100"
            data-testid="onboarding-next"
          >
            {isLastContentStep ? "Almost done! →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
