import { X } from "lucide-react";
import { usePlan, trackPlanEvent } from "@/hooks/usePlan";
import { useState, useEffect } from "react";
import { useSubscription, PREMIUM_ENABLED, type TierKey } from "@/lib/revenuecat";

export type PremiumFeature = "twin_ai" | "caregivers" | "magazine" | "academy" | "memories" | "general";

const FEATURE_INFO: Record<PremiumFeature, { emoji: string; title: string; tagline: string; benefit: string }> = {
  twin_ai: {
    emoji: "✨",
    title: "Unlimited Twin AI",
    tagline: "Ask anything, anytime",
    benefit:
      "Free plan includes 1 question per week. Premium unlocks unlimited conversations — your AI twin companion is always ready to help, day or night.",
  },
  caregivers: {
    emoji: "👨‍👩‍👧‍👦",
    title: "Caregiver Access",
    tagline: "Invite your village to help",
    benefit:
      "Share tracking with Dad, Grandma, or your nanny — everyone stays in sync on sleep, feeds, and diapers, all in one place.",
  },
  magazine: {
    emoji: "📖",
    title: "Full Twins Magazine Library",
    tagline: "Every issue, every story",
    benefit:
      "Access the complete archive of Twins Magazine — expert advice, real twin mom stories, and new releases every season.",
  },
  academy: {
    emoji: "🎓",
    title: "Twins Academy",
    tagline: "Expert-led learning, at your pace",
    benefit:
      "Premium courses and content from twin specialists — sleep training, tandem feeding, NICU survival, toddler schedules and more.",
  },
  memories: {
    emoji: "💝",
    title: "Premium Memory Cards",
    tagline: "Beautiful moments, beautifully saved",
    benefit:
      "Holiday templates, milestone cards, and premium share designs that make your twins' most precious memories truly unforgettable.",
  },
  general: {
    emoji: "💕",
    title: "TwinTrack Premium",
    tagline: "Everything your twin family needs",
    benefit:
      "Unlock the full TwinTrack experience — AI, caregivers, magazines, academy, and every future feature we build for twin families.",
  },
};

const ALL_BENEFITS = [
  { icon: "✨", text: "Unlimited Twin AI questions" },
  { icon: "👨‍👩‍👧‍👦", text: "Caregiver access for your whole family" },
  { icon: "📖", text: "Full Twins Magazine library" },
  { icon: "🎓", text: "Twins Academy expert courses" },
  { icon: "💝", text: "Premium memory cards & holiday templates" },
  { icon: "🚀", text: "All future Premium features" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  feature?: PremiumFeature;
  source?: string;
}

export default function UpgradeScreen({ open, onClose, feature = "general", source }: Props) {
  const { isInTrial, trialDaysLeft, pricing } = usePlan();
  const { purchaseByTier, isPurchasing } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<"monthly" | "annual" | "founding">(
    isInTrial ? "founding" : "annual",
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      trackPlanEvent("premium_page_viewed", { feature, source, isInTrial, trialDaysLeft });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const info = FEATURE_INFO[feature];
  const showFoundingPrice = isInTrial && pricing?.founding != null;
  const annualSavings =
    pricing
      ? Math.round(((pricing.monthly.cents * 12 - pricing.annual.cents) / (pricing.monthly.cents * 12)) * 100)
      : 18;

  if (!open) return null;

  function handleClose() {
    trackPlanEvent("upgrade_screen_dismissed", { feature, source });
    onClose();
  }

  async function handleUpgrade() {
    trackPlanEvent("upgrade_button_clicked", { feature, tier: selectedTier, source });
    setLoading(true);

    if (PREMIUM_ENABLED) {
      try {
        await purchaseByTier(selectedTier as TierKey);
        trackPlanEvent("checkout_started", { feature, tier: selectedTier, source });
        onClose();
      } catch (err) {
        console.warn("[RevenueCat] Purchase error:", err);
      } finally {
        setLoading(false);
      }
    } else {
      fetch("/api/plan/subscribe-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedTier }),
      })
        .then(() => {
          setSubscribed(true);
          trackPlanEvent("checkout_started", { feature, tier: selectedTier, source });
        })
        .catch(() => setSubscribed(true))
        .finally(() => setLoading(false));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl max-h-[92dvh] overflow-y-auto">
        <div
          style={{ background: "linear-gradient(135deg, #e91e8c 0%, #9c27b0 100%)" }}
          className="px-5 pt-6 pb-7 rounded-t-3xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">TwinTrack Premium</p>
              <div className="text-4xl mb-2">{info.emoji}</div>
              <h2 className="text-2xl font-bold text-white leading-tight">{info.title}</h2>
              <p className="text-white/80 text-sm mt-1">{info.tagline}</p>
            </div>
            <button onClick={handleClose} className="p-2 rounded-xl bg-white/20 mt-1 flex-shrink-0">
              <X size={16} className="text-white" />
            </button>
          </div>

          {isInTrial && trialDaysLeft > 0 && (
            <div className="mt-4 bg-white/20 rounded-2xl px-4 py-3 text-center">
              <p className="text-white font-bold text-lg">{trialDaysLeft} days left in your free trial</p>
              <p className="text-white/75 text-xs mt-0.5">Secure your Founding Moms price before it expires</p>
            </div>
          )}
        </div>

        <div className="px-5 py-5 space-y-5 pb-8">
          {subscribed ? (
            <div className="text-center py-8 space-y-3">
              <div className="text-5xl">💕</div>
              <h3 className="font-bold text-xl text-foreground">You're on the list!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                TwinTrack Premium subscriptions are launching soon on the App Store and Google Play. We'll notify you
                the moment it's ready — your Founding Mom pricing will be waiting for you. 💕
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold mt-4 active:scale-[0.98] transition-all"
              >
                Back to TwinTrack 💕
              </button>
            </div>
          ) : (
            <>
              <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-4">
                <p className="text-sm text-foreground leading-relaxed">{info.benefit}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Everything in Premium
                </p>
                <div className="space-y-2.5">
                  {ALL_BENEFITS.map((b) => (
                    <div key={b.text} className="flex items-center gap-3">
                      <span className="text-lg w-7 text-center flex-shrink-0 leading-none">{b.icon}</span>
                      <p className="text-sm text-foreground">{b.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Choose your plan
                </p>
                <div className="space-y-2.5">
                  {showFoundingPrice && pricing?.founding && (
                    <button
                      onClick={() => {
                        setSelectedTier("founding");
                        trackPlanEvent("annual_selected", { type: "founding" });
                      }}
                      className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                        selectedTier === "founding" ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">💕 Founding Moms</span>
                            <span className="text-[10px] font-bold bg-primary text-white rounded-full px-2 py-0.5">
                              BEST DEAL
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Lock in forever · Trial-only offer</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="font-bold text-foreground">{pricing.founding.label}</p>
                          <p className="text-[10px] text-muted-foreground line-through">{pricing.annual.label}</p>
                        </div>
                      </div>
                    </button>
                  )}

                  {pricing?.annual && (
                    <button
                      onClick={() => {
                        setSelectedTier("annual");
                        trackPlanEvent("annual_selected", { type: "regular" });
                      }}
                      className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                        selectedTier === "annual" ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">Annual</span>
                            {!showFoundingPrice && (
                              <span className="text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                                SAVE {annualSavings}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Billed once a year</p>
                        </div>
                        <p className="font-bold text-foreground flex-shrink-0 ml-2">{pricing.annual.label}</p>
                      </div>
                    </button>
                  )}

                  {pricing?.monthly && (
                    <button
                      onClick={() => {
                        setSelectedTier("monthly");
                        trackPlanEvent("monthly_selected");
                      }}
                      className={`w-full rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                        selectedTier === "monthly" ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-foreground">Monthly</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Cancel anytime</p>
                        </div>
                        <p className="font-bold text-foreground flex-shrink-0 ml-2">{pricing.monthly.label}</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => { void handleUpgrade(); }}
                disabled={loading || isPurchasing}
                className="w-full py-4 rounded-2xl font-bold text-white text-base active:scale-[0.98] transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #e91e8c 0%, #9c27b0 100%)" }}
              >
                {loading || isPurchasing ? "One moment…" : isInTrial ? "💕 Unlock Founding Moms" : "💕 Unlock Premium"}
              </button>

              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                {isInTrial
                  ? "Secure your Founding Moms price before the offer expires."
                  : "Cancel anytime. Billed through App Store or Google Play."}
              </p>
              <p className="text-center text-[11px] text-muted-foreground/60">No pushy sales. Ever. 💕</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
