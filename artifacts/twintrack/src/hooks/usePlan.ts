import { useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";

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

export function usePlan() {
  const { user } = useUser();

  const query = useQuery<PlanData>({
    queryKey: ["plan", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/plan");
      if (!res.ok) throw new Error("Failed to fetch plan");
      return res.json() as Promise<PlanData>;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const data = query.data;

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
  };
}

export function trackPlanEvent(event: string, properties?: Record<string, unknown>) {
  fetch("/api/plan/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties }),
  }).catch(() => {});
}
