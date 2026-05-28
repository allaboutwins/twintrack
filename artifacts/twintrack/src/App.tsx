import { useEffect, useRef, useState, useCallback } from "react";
import { posthog } from "./lib/posthog";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
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

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
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

  if (!userId || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background gap-4">
        <span className="text-4xl animate-pulse select-none">🍒</span>
        <p className="text-sm text-muted-foreground font-medium">Loading your twins' day…</p>
      </div>
    );
  }

  const needsOnboarding = !localComplete && (isError || !onboarding?.completedAt);

  if (needsOnboarding) {
    return (
      <OnboardingFlow
        userId={userId}
        userEmail={user?.primaryEmailAddress?.emailAddress ?? ""}
        onComplete={() => {
          setLocalComplete(true);
          qc.invalidateQueries({ queryKey: getGetOnboardingQueryKey(userId) });
        }}
      />
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
          <PushPermissionPrompt />
          <AppExperienceLayer />
          <PageTransition>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/dashboard">
                <ProtectedRoute component={Dashboard} />
              </Route>
              <Route path="/sleep">
                <ProtectedRoute component={Sleep} />
              </Route>
              <Route path="/feeding">
                <ProtectedRoute component={Feeding} />
              </Route>
              <Route path="/diapers">
                <ProtectedRoute component={Diapers} />
              </Route>
              <Route path="/routines">
                <ProtectedRoute component={Routines} />
              </Route>
              <Route path="/tv">
                <ProtectedRoute component={Learn} />
              </Route>
              <Route path="/learn">
                <ProtectedRoute component={Learn} />
              </Route>
              <Route path="/milestones">
                <ProtectedRoute component={Milestones} />
              </Route>
              <Route path="/admin/videos">
                <ProtectedRoute component={VideoAdmin} />
              </Route>
              <Route path="/admin">
                <AdminRoute component={Admin} />
              </Route>
              <Route path="/twin-ai">
                <ProtectedRoute component={TwinAI} />
              </Route>
              <Route path="/stats">
                <ProtectedRoute component={Stats} />
              </Route>
              <Route path="/settings">
                <ProtectedRoute component={Settings} />
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
