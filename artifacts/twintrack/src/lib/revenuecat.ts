import { createContext, useContext, type ReactNode, createElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const PREMIUM_ENABLED = import.meta.env.VITE_PREMIUM_ENABLED === "true";
export const ENTITLEMENT_ID = "premium";

export const PACKAGE_KEYS = {
  founding: "founding_annual",
  annual: "$rc_annual",
  monthly: "$rc_monthly",
} as const;

export type TierKey = keyof typeof PACKAGE_KEYS;

type RcPackage = {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    priceString: string;
    price: number;
    currencyCode: string;
    title: string;
    description: string;
    subscriptionPeriod?: string;
  };
};

type RcOffering = {
  identifier: string;
  serverDescription: string;
  availablePackages: RcPackage[];
};

type RcOfferings = {
  current: RcOffering | null;
  all: Record<string, RcOffering>;
};

type RcCustomerInfo = {
  activeSubscriptions: string[];
  entitlements: {
    active: Record<string, { isActive: boolean; expirationDate?: string }>;
    all: Record<string, { isActive: boolean; expirationDate?: string }>;
  };
};

type SubscriptionCtx = {
  offerings: RcOfferings | null;
  customerInfo: RcCustomerInfo | null;
  isSubscribed: boolean;
  isLoading: boolean;
  purchase: (pkg: RcPackage) => Promise<void>;
  purchaseByTier: (tier: TierKey) => Promise<void>;
  restore: () => Promise<void>;
  isPurchasing: boolean;
  isRestoring: boolean;
};

const SubscriptionContext = createContext<SubscriptionCtx | null>(null);

async function getPurchases() {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  return Purchases;
}

export function initializeRevenueCat(userId: string) {
  if (!PREMIUM_ENABLED) return;

  void (async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      const platform = Capacitor.getPlatform();

      const testKey = import.meta.env.VITE_REVENUECAT_TEST_API_KEY;
      const iosKey = import.meta.env.VITE_REVENUECAT_IOS_API_KEY;
      const androidKey = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY;

      let apiKey: string;
      if (platform === "ios" && iosKey) {
        apiKey = iosKey;
      } else if (platform === "android" && androidKey) {
        apiKey = androidKey;
      } else {
        apiKey = testKey ?? "";
      }

      if (!apiKey) {
        console.warn("[RevenueCat] No API key configured for platform:", platform);
        return;
      }

      const Purchases = await getPurchases();
      await Purchases.configure({ apiKey, appUserID: userId });
      await Purchases.logIn({ appUserID: userId });
      console.log("[RevenueCat] Configured for platform:", platform);
    } catch (err) {
      console.warn("[RevenueCat] Failed to initialize (expected in browser):", err);
    }
  })();
}

function useSubscriptionCtx(): SubscriptionCtx {
  const queryClient = useQueryClient();

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    enabled: PREMIUM_ENABLED,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RcOfferings | null> => {
      try {
        const Purchases = await getPurchases();
        const result = await Purchases.getOfferings();
        return result as unknown as RcOfferings;
      } catch {
        return null;
      }
    },
  });

  const customerQuery = useQuery({
    queryKey: ["revenuecat", "customer"],
    enabled: PREMIUM_ENABLED,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<RcCustomerInfo | null> => {
      try {
        const Purchases = await getPurchases();
        const result = await Purchases.getCustomerInfo();
        return result.customerInfo as unknown as RcCustomerInfo;
      } catch {
        return null;
      }
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: RcPackage) => {
      const Purchases = await getPurchases();
      const result = await Purchases.purchasePackage({ aPackage: pkg as never });
      return result;
    },
    onSuccess: () => {
      void customerQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const Purchases = await getPurchases();
      return Purchases.restorePurchases();
    },
    onSuccess: () => {
      void customerQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
    },
  });

  const isSubscribed = Boolean(
    customerQuery.data?.entitlements.active?.[ENTITLEMENT_ID],
  );

  function findPackageByTier(tier: TierKey): RcPackage | null {
    const key = PACKAGE_KEYS[tier];
    const current = offeringsQuery.data?.current;
    if (!current) return null;
    return current.availablePackages.find((p) => p.identifier === key) ?? null;
  }

  async function purchaseByTier(tier: TierKey): Promise<void> {
    const pkg = findPackageByTier(tier);
    if (!pkg) throw new Error(`Package not found for tier: ${tier}`);
    await purchaseMutation.mutateAsync(pkg);
  }

  return {
    offerings: offeringsQuery.data ?? null,
    customerInfo: customerQuery.data ?? null,
    isSubscribed,
    isLoading: offeringsQuery.isLoading || customerQuery.isLoading,
    purchase: (pkg: RcPackage) => purchaseMutation.mutateAsync(pkg).then(() => {}),
    purchaseByTier,
    restore: () => restoreMutation.mutateAsync().then(() => {}),
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const value = useSubscriptionCtx();
  return createElement(SubscriptionContext.Provider, { value }, children);
}

export function useSubscription(): SubscriptionCtx {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
