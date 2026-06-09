import { useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export interface PlanPricing {
  monthly: { cents: number; label: string };
  annual: { cents: number; label: string };
  founding: { cents: number; label: string } | null;
}

export interface PlanData {
  plan: "free" | "premium";
  status: "trial" | "active" | "cancelled" | "expired" | "free";
  isInTrial: boolean;
  isPremium: boolean;
  isFree: boolean;
  trialDaysLeft: number;
  trialEndsAt: string;
  isFoundingMom: boolean;
  billingSource: string | null;
  pricing: PlanPricing;
}

const CACHE_KEY = "tt_plan_cache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface PlanCache {
  data: PlanData;
  ts: number;
}

function saveCache(data: PlanData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() } satisfies PlanCache));
  } catch {}
}

function loadCache(): PlanData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: PlanCache = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function usePlan() {
  const { user } = useUser();

  const query = useQuery<PlanData>({
    queryKey: ["plan", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/plan");
      if (!res.ok) throw new Error("Failed to fetch plan");
      const data = res.json() as Promise<PlanData>;
      const resolved = await data;
      saveCache(resolved);
      return resolved;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const cachedData = query.isError ? loadCache() : null;
  const isUsingCachedPlan = query.isError && cachedData !== null;
  const verificationFailed = query.isError && cachedData === null;

  const loggedRef = useRef(false);
  useEffect(() => {
    if (isUsingCachedPlan && !loggedRef.current) {
      loggedRef.current = true;
      trackPlanEvent("rc_verification_failure", {
        reason: "api_fetch_failed",
        fromCache: true,
        cachedStatus: cachedData?.status ?? null,
      });
    }
    if (!query.isError) {
      loggedRef.current = false;
    }
  }, [isUsingCachedPlan, query.isError, cachedData?.status]);

  const data = query.data ?? cachedData ?? null;

  return {
    plan: data?.plan ?? ("free" as const),
    status: data?.status ?? ("free" as const),
    isInTrial: data?.isInTrial ?? false,
    isPremium: data?.isPremium ?? false,
    isFree: data?.isFree ?? true,
    trialDaysLeft: data?.trialDaysLeft ?? 0,
    trialEndsAt: data?.trialEndsAt ?? null,
    isFoundingMom: data?.isFoundingMom ?? false,
    pricing: data?.pricing ?? null,
    isLoading: query.isLoading,
    isUsingCachedPlan,
    verificationFailed,
  };
}

export function trackPlanEvent(event: string, properties?: Record<string, unknown>) {
  fetch("/api/plan/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties }),
  }).catch(() => {});
}
