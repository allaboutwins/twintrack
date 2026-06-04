import { useState } from "react";
import { X } from "lucide-react";
import { usePlan, trackPlanEvent } from "@/hooks/usePlan";
import UpgradeScreen from "./UpgradeScreen";

export default function FoundingMomsButton() {
  const { isPremium, isInTrial, trialDaysLeft, isFoundingMom, pricing, isLoading } = usePlan();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (isLoading) return <div className="w-9 h-9" />;

  const showUrgent = isInTrial && trialDaysLeft <= 3;
  const badgeLabel = isInTrial ? `${trialDaysLeft}d` : null;

  function openDrawer() {
    trackPlanEvent("premium_page_viewed", { source: "header_button" });
    setDrawerOpen(true);
  }

  return (
    <>
      <button
        onClick={openDrawer}
        className="relative p-2 rounded-full hover:bg-muted/60 transition-colors"
        aria-label="Founding Moms Premium"
        data-testid="founding-moms-button"
      >
        <span className="text-base leading-none select-none">💕</span>
        {badgeLabel && (
          <span
            className={`absolute top-1 right-0.5 min-w-[18px] h-[18px] rounded-full text-[8px] font-bold text-white flex items-center justify-center px-1 border-2 border-white ${
              showUrgent ? "bg-red-500" : "bg-primary"
            }`}
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="relative bg-white w-full max-w-[430px] mx-auto rounded-t-3xl max-h-[92dvh] overflow-y-auto">

            <div
              style={{ background: "linear-gradient(135deg, #e91e8c 0%, #9c27b0 100%)" }}
              className="px-5 pt-6 pb-6 rounded-t-3xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-2">
                    {isFoundingMom && !isInTrial ? "Your subscription" : "Founding Moms"}
                  </p>
                  <h2 className="text-2xl font-bold text-white">
                    {isFoundingMom && !isInTrial
                      ? "💕 Founding Mom"
                      : isInTrial
                        ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left`
                        : "💕 Go Premium"}
                  </h2>
                  <p className="text-white/80 text-sm mt-1 leading-snug">
                    {isFoundingMom && !isInTrial
                      ? "Thank you for being one of our founding supporters 💕"
                      : isInTrial
                        ? "Your free trial is active — secure your Founding Moms price"
                        : "Unlock everything TwinTrack has to offer"}
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl bg-white/20 mt-1 ml-3 flex-shrink-0"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>

              {isInTrial && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/20 rounded-xl py-2.5 px-2">
                    <p className="text-white font-bold text-xl">{trialDaysLeft}</p>
                    <p className="text-white/70 text-[10px]">days left</p>
                  </div>
                  <div className="bg-white/20 rounded-xl py-2.5 px-2">
                    <p className="text-white font-bold text-lg">
                      {pricing?.founding?.label.replace("/year", "") ?? "$39"}
                    </p>
                    <p className="text-white/70 text-[10px]">founding/year</p>
                  </div>
                  <div className="bg-white/20 rounded-xl py-2.5 px-2">
                    <p className="text-white font-bold text-lg">
                      {pricing?.monthly.label.replace("/month", "") ?? "$5.99"}
                    </p>
                    <p className="text-white/70 text-[10px]">per month</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-5 space-y-4 pb-8">
              {isFoundingMom && !isInTrial ? (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl px-5 py-4 text-center">
                    <p className="text-3xl mb-2">💕</p>
                    <p className="font-bold text-foreground">You're a Founding Mom</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      You're one of the first twin moms to support TwinTrack. Your $39/year rate is locked in forever.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      "Unlimited Twin AI",
                      "Caregiver Access",
                      "Full Magazine Library",
                      "Twins Academy",
                      "Premium Memory Cards",
                      "All future features",
                    ].map((b) => (
                      <div key={b} className="flex items-center gap-3">
                        <span className="text-primary text-sm font-bold">✓</span>
                        <span className="text-sm text-foreground">{b}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold active:scale-[0.98] transition-all"
                  >
                    Back to TwinTrack 💕
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      Premium includes
                    </p>
                    {[
                      { icon: "✨", text: "Unlimited Twin AI conversations" },
                      { icon: "👨‍👩‍👧‍👦", text: "Caregiver Access — Dad, Grandma, Nanny" },
                      { icon: "📖", text: "Full Twins Magazine library" },
                      { icon: "🎓", text: "Twins Academy expert courses" },
                      { icon: "💝", text: "Premium memory cards & holiday templates" },
                      { icon: "🚀", text: "All future Premium features" },
                    ].map((b) => (
                      <div key={b.text} className="flex items-center gap-3 py-0.5">
                        <span className="text-base w-6 leading-none">{b.icon}</span>
                        <span className="text-sm text-foreground">{b.text}</span>
                      </div>
                    ))}
                  </div>

                  {isInTrial && pricing?.founding && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                      <p className="text-sm font-bold text-amber-800">
                        💕 Founding Moms offer expires when your trial ends
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Lock in $39/year forever — regular price is $49/year after your trial.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      setTimeout(() => setShowUpgrade(true), 50);
                    }}
                    className="w-full py-4 rounded-2xl font-bold text-white text-base active:scale-[0.98] transition-all"
                    style={{ background: "linear-gradient(135deg, #e91e8c 0%, #9c27b0 100%)" }}
                  >
                    {isInTrial ? "💕 See Founding Moms Pricing" : "💕 Unlock Premium"}
                  </button>

                  <p className="text-center text-xs text-muted-foreground">No pressure. We just want to help. 💕</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <UpgradeScreen
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="general"
        source="header_founding_moms"
      />
    </>
  );
}
