import { useLocation } from "wouter";
import { XCircle } from "lucide-react";

export default function PayPalCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-6">
      <XCircle className="text-muted-foreground" size={56} />
      <p className="text-xl font-bold text-foreground">Subscription cancelled</p>
      <p className="text-sm text-muted-foreground">
        No charge was made. You can subscribe anytime from Settings.
      </p>
      <button
        onClick={() => setLocation("/settings")}
        className="mt-2 px-6 py-3 rounded-2xl bg-primary text-white font-bold text-sm"
      >
        Back to Settings
      </button>
    </div>
  );
}
