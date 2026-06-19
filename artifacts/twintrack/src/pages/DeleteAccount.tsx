import { Link } from "wouter";
import logoAat from "../assets/logo-aat.png";

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 py-12 max-w-[500px] mx-auto">
      <img src={logoAat} alt="TwinTrack" className="h-14 w-auto mb-8" />

      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Delete Your Account</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            We're sorry to see you go. Here's how to request deletion of your TwinTrack account and all associated data.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <h2 className="font-bold text-foreground">How to request deletion</h2>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>Open the TwinTrack app and sign in to your account.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>Go to <strong>Settings</strong> (gear icon in the top-right corner).</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>Scroll to the bottom and tap <strong>Delete Account</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <span>Confirm deletion. Your account and all data will be permanently removed.</span>
            </li>
          </ol>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <h2 className="font-bold text-foreground">Can't access the app?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you cannot access your account, email us directly and we will delete your account within 30 days:
          </p>
          <a
            href="mailto:support@allaboutwins.com?subject=Account%20Deletion%20Request"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold transition-all active:scale-95"
          >
            support@allaboutwins.com
          </a>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <h2 className="font-bold text-foreground">What gets deleted</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-destructive font-bold">✕</span> Your account and sign-in credentials</li>
            <li className="flex gap-2"><span className="text-destructive font-bold">✕</span> Twin profiles and all tracking data (sleep, feeding, diapers)</li>
            <li className="flex gap-2"><span className="text-destructive font-bold">✕</span> Memories, milestones, and notes</li>
            <li className="flex gap-2"><span className="text-destructive font-bold">✕</span> Notification preferences and saved bookmarks</li>
            <li className="flex gap-2"><span className="text-destructive font-bold">✕</span> Any subscription or caregiver connections</li>
          </ul>
          <p className="text-xs text-muted-foreground/70 pt-1">
            Deletion is permanent and cannot be undone. Anonymised aggregate analytics (no personal data) may be retained for product improvement.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-2">
          <h2 className="font-bold text-foreground">Retention period</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Upon request, all personal data is deleted within <strong>30 days</strong>. Backup copies are purged within 90 days.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Questions? See our{" "}
          <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>
          {" "}or email{" "}
          <a href="mailto:support@allaboutwins.com" className="text-primary underline">support@allaboutwins.com</a>.
        </p>
      </div>
    </div>
  );
}
