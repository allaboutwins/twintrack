import { Component, useEffect, useRef, useState, useCallback, type ReactNode, type ErrorInfo } from "react";
import { posthog } from "./lib/posthog";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { isNativePlatform } from "@/lib/native";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetOnboarding, getGetOnboardingQueryKey } from "@workspace/api-client-react";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import InAppBrowserGate from "@/components/InAppBrowserGate";
import PageTransition from "@/components/PageTransition";
import PushPermissionPrompt from "@/components/PushPermissionPrompt";
import AppExperienceLayer from "@/components/AppExperienceLayer";
import HeartbeatReporter from "@/components/HeartbeatReporter";
import NotFound from "@/pages/not-found";
import OnboardingFlow from "@/pages/OnboardingFlow";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Sleep from "@/pages/Sleep";
import Feeding from "@/pages/Feeding";
import Diapers from "@/pages/Diapers";
import Routines from "@/pages/Routines";
import Learn from "@/pages/Learn";
import Milestones from "@/pages/Milestones";
import Settings from "@/pages/Settings";
import TwinAI from "@/pages/TwinAI";
import VideoAdmin from "@/pages/VideoAdmin";
import Admin from "@/pages/Admin";
import Stats from "@/pages/Stats";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#da5a9f",
    colorBackground: "#fdf8fa",
    colorForeground: "#1a4a50",
    colorMutedForeground: "#6b9ea5",
    colorDanger: "#e74c3c",
    colorInput: "#f5eff3",
    colorInputForeground: "#1a4a50",
    colorNeutral: "#e8d5e4",
    fontFamily: "'Quicksand', sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold",
    headerSubtitle: "text-muted-foreground",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-semibold",
    footerActionText: "text-muted-foreground",
    formButtonPrimary: "bg-primary hover:bg-primary/90 font-semibold",
    dividerText: "text-muted-foreground",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

/**
 * Silently watches for a new service worker to become installed.
 * When detected it shows a one-tap "Reload for update" toast.
 * This replaces the old clientsClaim approach, which forced all open tabs
 * onto the new SW mid-session and wiped their loaded JS chunks → blank screen.
 */
function SwUpdateNotifier() {
  const { toast } = useToast();
  const toastShown = useRef(false);

  const promptReload = useCallback(() => {
    if (toastShown.current) return;
    toastShown.current = true;
    toast({
      title: "TwinTrack just updated 🍒",
      description: "Tap to reload and get the latest version.",
      duration: 0, // stay until dismissed
      action: (
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
        >
          Reload
        </button>
      ),
    });
  }, [toast]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // When a *new* SW has finished installing (state = "installed"), the old SW
    // is still controlling this tab (no clientsClaim). We prompt the user to
    // reload so they pick up the update cleanly on their own terms.
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              promptReload();
            }
          });
        });
      })
      .catch(() => {/* non-fatal */});
  }, [promptReload]);

  return null;
}

/**
 * Handles Capacitor Universal Links / App Links (deep links).
 * When the user taps a link like https://yourdomain.com/invite?token=xxx,
 * iOS/Android opens the app and fires `appUrlOpen` instead of opening Safari.
 * We parse the path and navigate to the right route in-app.
 */
function DeepLinkHandler() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cleanup: (() => void) | null = null;

    import("@capacitor/app").then(({ App: CapApp }) => {
      CapApp.addListener("appUrlOpen", (event) => {
        try {
          const url = new URL(event.url);
          // Strip the base path if present, then navigate to the path + search
          const path = url.pathname + url.search;
          const stripped = basePath && path.startsWith(basePath)
            ? path.slice(basePath.length) || "/"
            : path;
          setLocation(stripped);
          posthog?.capture("deep_link_opened", { path: stripped });
        } catch {
          // Malformed URL — ignore
        }
      }).then((listener) => {
        cleanup = () => listener.remove();
      }).catch(() => {});
    }).catch(() => {});

    return () => { cleanup?.(); };
  }, [setLocation]);

  return null;
}

function PostHogIdentifier() {
  const { user } = useUser();
  useEffect(() => {
    if (!user) return;
    posthog?.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName ?? undefined,
      created_at: user.createdAt?.toISOString(),
    });
  }, [user?.id]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

/** POST a crash report to the server (used from error boundaries). */
function reportCrash(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({
      ...payload,
      url: window.location.href,
      userAgent: navigator.userAgent,
      ts: Date.now(),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/client-errors", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/client-errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* never crash the crash reporter */ }
}

/**
 * Per-route error boundary.
 * Catches a crash in a single route and shows a minimal recovery UI without
 * taking down the whole app. Reports to /api/client-errors so crashes are
 * visible in production logs.
 */
class RouteErrorBoundary extends Component<
  { children: ReactNode; route: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[RouteErrorBoundary:${this.props.route}]`, error);
    reportCrash({
      type: "route_error_boundary",
      route: this.props.route,
      message: error.message,
      stack: error.stack?.slice(0, 2000),
      component: info.componentStack?.slice(0, 1000),
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fdf8fa",
          padding: "32px 24px",
          fontFamily: "'Quicksand', sans-serif",
          textAlign: "center",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>🍒</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: "#1a4a50", margin: 0 }}>
          This page hit an error
        </p>
        <p style={{ fontSize: 13, color: "#6b9ea5", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
          Your data is safe. Tap below to go back to the dashboard.
        </p>
        <button
          onClick={() => { this.setState({ error: null }); window.location.replace("/"); }}
          style={{
            background: "#da5a9f", color: "white", border: "none",
            borderRadius: 14, padding: "12px 28px",
            fontFamily: "'Quicksand', sans-serif", fontSize: 15, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Go to Dashboard
        </button>
        <p style={{ fontSize: 11, color: "#b0b0b0", margin: 0 }}>
          {this.state.error.message.slice(0, 100)}
        </p>
      </div>
    );
  }
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background gap-4">
      <span className="text-4xl animate-pulse select-none">🍒</span>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: clerkLoaded } = useUser();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const { data: onboarding, isLoading, isError } = useGetOnboarding(userId, {
    query: {
      queryKey: getGetOnboardingQueryKey(userId),
      enabled: !!userId,
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  const [localComplete, setLocalComplete] = useState(false);

  // Show loading checkpoints so the user can see exactly where the app is
  if (!clerkLoaded) {
    return <LoadingScreen message="Signing you in…" />;
  }
  if (!userId) {
    return <LoadingScreen message="Verifying account…" />;
  }
  if (isLoading) {
    return <LoadingScreen message="Loading your twins' day…" />;
  }

  const needsOnboarding = !localComplete && (isError || !onboarding?.completedAt);

  if (needsOnboarding) {
    return (
      <AppErrorBoundary boundary="OnboardingFlow">
        <OnboardingFlow
          userId={userId}
          userEmail={user?.primaryEmailAddress?.emailAddress ?? ""}
          onComplete={() => {
            setLocalComplete(true);
            qc.invalidateQueries({ queryKey: getGetOnboardingQueryKey(userId) });
          }}
        />
      </AppErrorBoundary>
    );
  }

  return <>{children}</>;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <OnboardingGate>
          <Component />
        </OnboardingGate>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

const queryClient = new QueryClient();

const clerkLocalization = {
  applicationName: "TwinTrack",
  signIn: {
    start: {
      title: "Welcome back to TwinTrack",
      subtitle: "Sign in to continue tracking your twins",
      actionText: "Don't have an account?",
      actionLink: "Sign up",
    },
  },
  signUp: {
    start: {
      title: "Join TwinTrack 💕",
      subtitle: "The app that finally understands twin life",
      actionText: "Already have an account?",
      actionLink: "Sign in",
    },
  },
};

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <PostHogIdentifier />
        <TooltipProvider>
          <SwUpdateNotifier />
          <DeepLinkHandler />
          <HeartbeatReporter />
          <PushPermissionPrompt />
          <AppExperienceLayer />
          <PageTransition>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/dashboard">
                <RouteErrorBoundary route="dashboard">
                  <ProtectedRoute component={Dashboard} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/sleep">
                <RouteErrorBoundary route="sleep">
                  <ProtectedRoute component={Sleep} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/feeding">
                <RouteErrorBoundary route="feeding">
                  <ProtectedRoute component={Feeding} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/diapers">
                <RouteErrorBoundary route="diapers">
                  <ProtectedRoute component={Diapers} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/routines">
                <RouteErrorBoundary route="routines">
                  <ProtectedRoute component={Routines} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/tv">
                <RouteErrorBoundary route="tv">
                  <ProtectedRoute component={Learn} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/learn">
                <RouteErrorBoundary route="learn">
                  <ProtectedRoute component={Learn} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/milestones">
                <RouteErrorBoundary route="milestones">
                  <ProtectedRoute component={Milestones} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/admin/videos">
                <RouteErrorBoundary route="admin-videos">
                  <ProtectedRoute component={VideoAdmin} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/admin">
                <AdminRoute component={Admin} />
              </Route>
              <Route path="/twin-ai">
                <RouteErrorBoundary route="twin-ai">
                  <ProtectedRoute component={TwinAI} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/stats">
                <RouteErrorBoundary route="stats">
                  <ProtectedRoute component={Stats} />
                </RouteErrorBoundary>
              </Route>
              <Route path="/settings">
                <RouteErrorBoundary route="settings">
                  <ProtectedRoute component={Settings} />
                </RouteErrorBoundary>
              </Route>
              <Route component={NotFound} />
            </Switch>
          </PageTransition>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <InAppBrowserGate>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </InAppBrowserGate>
    </AppErrorBoundary>
  );
}

export default App;
