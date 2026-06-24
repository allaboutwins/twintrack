import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PayPalSuccess() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const subscriptionId = params.get("subscription_id");
    if (!subscriptionId) {
      setErrorMsg("No subscription ID found in URL.");
      setStatus("error");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/paypal/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          throw new Error(d.error ?? `HTTP ${res.status}`);
        }
        await queryClient.invalidateQueries({ queryKey: ["plan", user?.id] });
        setStatus("success");
        setTimeout(() => setLocation("/dashboard"), 2500);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Activation failed");
        setStatus("error");
      }
    })();
  }, [search, queryClient, setLocation, user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-6">
      {status === "loading" && (
        <>
          <Loader2 className="text-primary animate-spin" size={48} />
          <p className="text-lg font-semibold text-foreground">Activating your premium subscription…</p>
          <p className="text-sm text-muted-foreground">Just a moment while we verify with PayPal.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="text-green-500" size={56} />
          <p className="text-2xl font-bold text-foreground">You're all set! 🎉</p>
          <p className="text-sm text-muted-foreground">Your TwinTrack Premium subscription is now active.<br />Redirecting you to your dashboard…</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="text-destructive" size={56} />
          <p className="text-xl font-bold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => setLocation("/settings")}
            className="mt-2 px-6 py-3 rounded-2xl bg-primary text-white font-bold text-sm"
          >
            Go to Settings
          </button>
        </>
      )}
    </div>
  );
}
