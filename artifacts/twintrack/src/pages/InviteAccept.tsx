import { useEffect, useState } from "react";
import { useUser, SignIn, SignUp } from "@clerk/react";
import { useLocation } from "wouter";

type Step = "loading" | "preview" | "sign-in" | "sign-up" | "accepting" | "done" | "error";

interface InviteInfo {
  role: string;
  ownerName?: string;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function InviteAccept() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [, setLocation] = useLocation();

  const token = (() => {
    try { return new URLSearchParams(window.location.search).get("token") ?? ""; }
    catch { return ""; }
  })();

  const [step, setStep] = useState<Step>("loading");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Once Clerk loads, decide what to show
  useEffect(() => {
    if (!isLoaded) return;
    if (!token) { setStep("error"); setErrorMsg("Invalid invite link — no token found."); return; }
    if (isSignedIn) {
      setStep("accepting");
    } else {
      setStep("preview");
      setInfo({ role: "Caregiver" });
    }
  }, [isLoaded, isSignedIn, token]);

  // Accept the invite once signed in
  useEffect(() => {
    if (step !== "accepting" || !user?.id || !token) return;

    fetch("/api/caregivers/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId: user.id }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStep("done");
          setTimeout(() => setLocation("/dashboard"), 1800);
        } else {
          const body = await res.json().catch(() => ({})) as { error?: string };
          setErrorMsg(body.error ?? `Invite failed (${res.status})`);
          setStep("error");
        }
      })
      .catch((err) => {
        setErrorMsg(String(err));
        setStep("error");
      });
  }, [step, user?.id, token, setLocation]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-[100dvh] bg-gradient-to-br from-pink-50 via-purple-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#e91e8c] to-[#9c27b0] px-6 py-8 text-center">
          <div className="text-5xl mb-3">👶</div>
          <p className="text-xs font-bold tracking-widest text-white/70 uppercase mb-1">TwinTrack</p>
          <h1 className="text-xl font-extrabold text-white leading-snug">
            You've been invited<br/>to help with the twins 💕
          </h1>
        </div>
        {children}
      </div>
    </div>
  );

  if (step === "loading") {
    return (
      <Shell>
        <div className="px-6 py-10 text-center text-muted-foreground text-sm">
          Loading invite…
        </div>
      </Shell>
    );
  }

  if (step === "done") {
    return (
      <Shell>
        <div className="px-6 py-10 text-center space-y-3">
          <div className="text-5xl">🎉</div>
          <p className="font-bold text-lg text-foreground">You're in!</p>
          <p className="text-sm text-muted-foreground">Heading to your family dashboard…</p>
        </div>
      </Shell>
    );
  }

  if (step === "accepting") {
    return (
      <Shell>
        <div className="px-6 py-10 text-center text-sm text-muted-foreground space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Linking you to the family…</p>
        </div>
      </Shell>
    );
  }

  if (step === "error") {
    return (
      <Shell>
        <div className="px-6 py-10 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <p className="font-bold text-foreground">Invite problem</p>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <p className="text-xs text-muted-foreground">
            Ask the parent to send you a fresh invite link from their Settings.
          </p>
        </div>
      </Shell>
    );
  }

  if (step === "sign-in") {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-pink-50 via-purple-50 to-white flex flex-col items-center justify-center p-4">
        <SignIn
          routing="hash"
          signUpUrl={`${basePath}/invite?token=${token}#sign-up`}
          fallbackRedirectUrl={`${basePath}/invite?token=${token}`}
        />
        <button
          onClick={() => setStep("preview")}
          className="mt-4 text-xs text-muted-foreground underline underline-offset-2"
        >
          Back
        </button>
      </div>
    );
  }

  if (step === "sign-up") {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-pink-50 via-purple-50 to-white flex flex-col items-center justify-center p-4">
        <SignUp
          routing="hash"
          signInUrl={`${basePath}/invite?token=${token}#sign-in`}
          fallbackRedirectUrl={`${basePath}/invite?token=${token}`}
        />
        <button
          onClick={() => setStep("preview")}
          className="mt-4 text-xs text-muted-foreground underline underline-offset-2"
        >
          Back
        </button>
      </div>
    );
  }

  // preview — signed-out landing
  return (
    <Shell>
      <div className="px-6 py-7 space-y-5">
        {info && (
          <p className="text-sm text-center text-muted-foreground leading-relaxed">
            A family has invited you to help track their twins as{" "}
            <strong className="text-foreground">{info.role}</strong> using TwinTrack.
          </p>
        )}

        {/* Feature highlights */}
        <div className="bg-purple-50 rounded-2xl px-4 py-4 space-y-2">
          {[
            "🌙 Track sleep together",
            "🍼 Log feedings in one tap",
            "🚼 Record diaper changes",
            "📊 Live dashboard for both babies",
          ].map((f) => (
            <p key={f} className="text-xs text-muted-foreground">{f}</p>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-2.5">
          <button
            onClick={() => setStep("sign-up")}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#e91e8c] to-[#9c27b0] text-white font-bold text-sm shadow-md active:scale-95 transition-all"
            data-testid="btn-invite-create-account"
          >
            Create a free account →
          </button>
          <button
            onClick={() => setStep("sign-in")}
            className="w-full py-3.5 rounded-2xl border border-border text-sm font-semibold text-foreground active:scale-95 transition-all"
            data-testid="btn-invite-sign-in"
          >
            I already have an account — Sign in
          </button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
          TwinTrack is free for caregivers. By joining you agree to our{" "}
          <a href="https://allaboutwins.com/terms" className="underline">Terms</a> and{" "}
          <a href="https://allaboutwins.com/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </Shell>
  );
}
