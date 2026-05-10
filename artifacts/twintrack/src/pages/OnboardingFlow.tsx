import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSaveOnboarding, getGetOnboardingQueryKey } from "@workspace/api-client-react";
import { Check } from "lucide-react";

type Step = "welcome" | "family" | "age" | "prematurity" | "journey" | "done";

interface FormState {
  parentStatus: string;
  multipleType: string;
  babyAgeGroup: string;
  isPremature: boolean | null;
  gestationalAgeWeeks: number | null;
  hadNicu: boolean | null;
  wantsAdjustedAge: boolean | null;
  biggestChallenge: string;
  featureInterest: string;
}

const CHALLENGES = [
  { key: "sleep", label: "😴 Sleep deprivation" },
  { key: "feeding", label: "🍼 Feeding two at once" },
  { key: "time", label: "⏰ Finding time for myself" },
  { key: "schedules", label: "📅 Managing schedules" },
  { key: "mental-health", label: "🧠 Mental health & burnout" },
  { key: "support", label: "🤝 Feeling supported" },
  { key: "other", label: "💬 Something else" },
];

const FEATURES = [
  { key: "sleep-tracker", label: "😴 Sleep Tracker" },
  { key: "feeding-log", label: "🍼 Feeding Log" },
  { key: "milestones", label: "💕 Milestones & Memories" },
  { key: "learn", label: "🎓 Twin Parenting Videos" },
  { key: "routines", label: "📋 Daily Routines" },
  { key: "all", label: "✨ All of it!" },
];

function getSteps(parentStatus: string): Step[] {
  const steps: Step[] = ["welcome", "family"];
  if (parentStatus === "parenting") {
    steps.push("age");
    steps.push("prematurity");
  }
  steps.push("journey");
  steps.push("done");
  return steps;
}

export default function OnboardingFlow({
  userId,
  onComplete,
}: {
  userId: string;
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
    biggestChallenge: "",
    featureInterest: "",
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
          biggestChallenge: form.biggestChallenge || null,
          featureInterest: form.featureInterest || null,
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
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">🌟 Founding Member</p>
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
              I'm in! Let's go →
            </button>
            <p className="text-xs text-muted-foreground mt-4">Takes about 1 minute</p>
          </div>
        )}

        {/* ── FAMILY ── */}
        {currentStep === "family" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step 1 of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">Tell us about your family 👨‍👩‍👧‍👦</h2>
            </div>

            <div>
              <p className="font-semibold text-sm text-foreground mb-3">Are you expecting or already parenting?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "expecting", label: "Expecting twins", emoji: "🤰" },
                  { key: "parenting", label: "Already parenting", emoji: "👶" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setForm((f) => ({ ...f, parentStatus: opt.key }))}
                    className={`py-5 px-3 rounded-2xl border-2 text-center transition-all ${
                      form.parentStatus === opt.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-foreground"
                    }`}
                    data-testid={`parent-status-${opt.key}`}
                  >
                    <div className="text-4xl mb-1.5">{opt.emoji}</div>
                    <p className="text-xs font-semibold leading-tight">{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-sm text-foreground mb-3">What kind of multiples?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "twins", label: "👯 Twins" },
                  { key: "triplets", label: "🌟 Triplets" },
                  { key: "quads", label: "🍀 Quads" },
                  { key: "other", label: "💫 Other multiples" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setForm((f) => ({ ...f, multipleType: opt.key }))}
                    className={`py-3.5 px-4 rounded-xl border-2 text-sm font-semibold text-center transition-all ${
                      form.multipleType === opt.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-foreground"
                    }`}
                    data-testid={`multiple-type-${opt.key}`}
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
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("age") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">How old are your babies? 🍼</h2>
              <p className="text-sm text-muted-foreground mt-1">This helps us recommend the right content for your stage.</p>
            </div>

            <div className="space-y-3">
              {[
                { key: "newborn", label: "Newborn", desc: "0 – 3 months", emoji: "🐣" },
                { key: "infant", label: "Infant", desc: "3 – 12 months", emoji: "🍼" },
                { key: "toddler", label: "Toddler", desc: "1 – 3 years", emoji: "🧒" },
                { key: "older", label: "Older", desc: "3+ years", emoji: "🌟" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setForm((f) => ({ ...f, babyAgeGroup: opt.key }))}
                  className={`w-full py-4 px-5 rounded-2xl border-2 flex items-center gap-4 text-left transition-all ${
                    form.babyAgeGroup === opt.key ? "border-primary bg-primary/10" : "border-border bg-white"
                  }`}
                  data-testid={`age-group-${opt.key}`}
                >
                  <span className="text-3xl flex-shrink-0">{opt.emoji}</span>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${form.babyAgeGroup === opt.key ? "text-primary" : "text-foreground"}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {form.babyAgeGroup === opt.key && <Check size={18} className="text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PREMATURITY ── */}
        {currentStep === "prematurity" && (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Step {contentSteps.indexOf("prematurity") + 1} of {contentSteps.length}
              </p>
              <h2 className="text-xl font-bold text-foreground">Were they born early? 💛</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We're building dedicated support for preemie families.
              </p>
            </div>

            <div>
              <p className="font-semibold text-sm mb-3">Were your babies premature?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: true, label: "Yes 💛", desc: "Born before 37 weeks" },
                  { val: false, label: "No 😊", desc: "Born at or near term" },
                ].map((opt) => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setForm((f) => ({ ...f, isPremature: opt.val }))}
                    className={`py-5 px-3 rounded-2xl border-2 text-center transition-all ${
                      form.isPremature === opt.val
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-foreground"
                    }`}
                    data-testid={`premature-${opt.val}`}
                  >
                    <p className="font-bold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.isPremature === true && (
              <div className="space-y-4 bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                <div>
                  <p className="font-semibold text-sm mb-2">Gestational age at birth (weeks)</p>
                  <input
                    type="number"
                    value={form.gestationalAgeWeeks ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        gestationalAgeWeeks: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="e.g. 30"
                    min={22}
                    max={36}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-border text-sm outline-none focus:ring-2 ring-primary/30"
                    data-testid="gestational-age"
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-2">Did they have a NICU stay?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: true, label: "Yes 💛" },
                      { val: false, label: "No 😊" },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setForm((f) => ({ ...f, hadNicu: opt.val }))}
                        className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                          form.hadNicu === opt.val ? "border-primary bg-primary/10 text-primary" : "border-border bg-white"
                        }`}
                        data-testid={`nicu-${opt.val}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Would you like adjusted age tracking?</p>
                  <p className="text-xs text-muted-foreground mb-2">Tracks milestones based on corrected age.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: true, label: "Yes please 🌟" },
                      { val: false, label: "Not yet" },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setForm((f) => ({ ...f, wantsAdjustedAge: opt.val }))}
                        className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                          form.wantsAdjustedAge === opt.val
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-white"
                        }`}
                        data-testid={`adjusted-age-${opt.val}`}
                      >
                        {opt.label}
                      </button>
                    ))}
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
              <p className="font-semibold text-sm mb-3">What's your biggest challenge right now?</p>
              <div className="flex flex-wrap gap-2">
                {CHALLENGES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setForm((f) => ({ ...f, biggestChallenge: c.key }))}
                    className={`px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                      form.biggestChallenge === c.key
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
              <p className="font-semibold text-sm mb-3">Which feature excites you most?</p>
              <div className="flex flex-wrap gap-2">
                {FEATURES.map((feat) => (
                  <button
                    key={feat.key}
                    onClick={() => setForm((f) => ({ ...f, featureInterest: feat.key }))}
                    className={`px-3 py-2 rounded-full text-xs font-semibold border-2 transition-all ${
                      form.featureInterest === feat.key
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

        {/* ── DONE ── */}
        {currentStep === "done" && (
          <div className="flex flex-col items-center justify-center min-h-full p-8 text-center bg-gradient-to-b from-primary/8 via-background to-accent/8">
            <div className="text-7xl mb-5" style={{ lineHeight: 1 }}>
              🎉
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
            className="flex-[2] py-3.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm active:scale-[0.98] transition-all"
            data-testid="onboarding-next"
          >
            {currentStep === "journey" ? "Almost done! →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}
