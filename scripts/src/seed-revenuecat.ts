import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "TwinTrack";
const APP_STORE_APP_NAME = "TwinTrack iOS";
const APP_STORE_BUNDLE_ID = "com.allaboutwins.twintrack";
const PLAY_STORE_APP_NAME = "TwinTrack Android";
const PLAY_STORE_PACKAGE_NAME = "com.allaboutwins.twintrack";

const ENTITLEMENT_IDENTIFIER = "premium";
const ENTITLEMENT_DISPLAY_NAME = "Premium Access";

const OFFERING_IDENTIFIER = "founding_moms";
const OFFERING_DISPLAY_NAME = "Founding Moms";

type ProductDef = {
  id: string;
  playId: string;
  displayName: string;
  title: string;
  duration: "P1M" | "P1Y";
  priceCents: number;
  packageKey: string;
  packageName: string;
};

const PRODUCTS: ProductDef[] = [
  {
    id: "twintrack_founding_annual",
    playId: "twintrack_founding_annual:annual",
    displayName: "Founding Moms Annual",
    title: "Founding Moms Annual — $39/year",
    duration: "P1Y",
    priceCents: 3900,
    packageKey: "founding_annual",
    packageName: "Founding Annual",
  },
  {
    id: "twintrack_premium_annual",
    playId: "twintrack_premium_annual:annual",
    displayName: "Premium Annual",
    title: "Premium Annual — $49/year",
    duration: "P1Y",
    priceCents: 4900,
    packageKey: "$rc_annual",
    packageName: "Annual Subscription",
  },
  {
    id: "twintrack_premium_monthly",
    playId: "twintrack_premium_monthly:monthly",
    displayName: "Premium Monthly",
    title: "Premium Monthly — $5.99/month",
    duration: "P1M",
    priceCents: 599,
    packageKey: "$rc_monthly",
    packageName: "Monthly Subscription",
  },
];

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ──────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error(`Failed to list projects: ${JSON.stringify(listProjectsError)}`);

  // Use the first project if none named TwinTrack (v2 keys are project-scoped)
  const existingProject =
    existingProjects.items?.find((p) => p.name === PROJECT_NAME) ??
    existingProjects.items?.[0];

  if (existingProject) {
    console.log(`Using project "${existingProject.name}":`, existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error(`Failed to create project: ${JSON.stringify(error)}`);
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ──────────────────────────────────────────────────────────────────
  const { data: appsData, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError) throw new Error(`Failed to list apps: ${JSON.stringify(listAppsError)}`);

  const existingApps = appsData?.items ?? [];
  let appStoreApp: App | undefined = existingApps.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = existingApps.find((a) => a.type === "play_store");

  if (!appStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error(`Failed to create App Store app: ${JSON.stringify(error)}`);
    appStoreApp = data;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app found:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error(`Failed to create Play Store app: ${JSON.stringify(error)}`);
    playStoreApp = data;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app found:", playStoreApp.id);
  }

  // ── Products ──────────────────────────────────────────────────────────────
  const { data: existingProductsData, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error(`Failed to list products: ${JSON.stringify(listProductsError)}`);

  const existingProducts = existingProductsData?.items ?? [];

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeIdentifier: string,
    def: ProductDef,
  ): Promise<Product> => {
    const existing = existingProducts.find(
      (p) => p.store_identifier === storeIdentifier && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }

    const body: CreateProductData["body"] = {
      store_identifier: storeIdentifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: def.displayName,
    };

    const { data, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${label} product: ${JSON.stringify(error)}`);
    console.log(`Created ${label} product:`, data.id);
    return data;
  };

  const productIds: string[] = [];
  const productMap: Record<string, { iosId: string; androidId: string }> = {};

  for (const def of PRODUCTS) {
    const iosProduct = await ensureProduct(appStoreApp, `iOS/${def.id}`, def.id, def);
    const androidProduct = await ensureProduct(playStoreApp, `Android/${def.id}`, def.playId, def);
    productIds.push(iosProduct.id, androidProduct.id);
    productMap[def.packageKey] = { iosId: iosProduct.id, androidId: androidProduct.id };
  }

  // ── Entitlement ───────────────────────────────────────────────────────────
  let entitlement: Entitlement;
  const { data: existingEntitlementsData, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error(`Failed to list entitlements: ${JSON.stringify(listEntitlementsError)}`);

  const existingEntitlement = existingEntitlementsData?.items?.find(
    (e) => e.lookup_key === ENTITLEMENT_IDENTIFIER,
  );
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error(`Failed to create entitlement: ${JSON.stringify(error)}`);
    console.log("Created entitlement:", data.id);
    entitlement = data;
  }

  const { error: attachEntError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: productIds },
  });
  if (attachEntError) {
    const typed = attachEntError as { type?: string };
    if (typed.type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      console.warn("Warning attaching products to entitlement:", JSON.stringify(attachEntError));
    }
  } else {
    console.log("Attached all products to entitlement");
  }

  // ── Offering ──────────────────────────────────────────────────────────────
  let offering: Offering;
  const { data: existingOfferingsData, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error(`Failed to list offerings: ${JSON.stringify(listOfferingsError)}`);

  const existingOffering = existingOfferingsData?.items?.find(
    (o) => o.lookup_key === OFFERING_IDENTIFIER,
  );
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error(`Failed to create offering: ${JSON.stringify(error)}`);
    console.log("Created offering:", data.id);
    offering = data;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error(`Failed to set offering as current: ${JSON.stringify(error)}`);
    console.log("Set offering as current");
  }

  // ── Packages ──────────────────────────────────────────────────────────────
  const { data: existingPackagesData, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error(`Failed to list packages: ${JSON.stringify(listPackagesError)}`);

  const existingPackages = existingPackagesData?.items ?? [];

  for (const def of PRODUCTS) {
    const existingPkg = existingPackages.find((p) => p.lookup_key === def.packageKey);

    let pkg: Package;
    if (existingPkg) {
      console.log(`Package ${def.packageKey} already exists:`, existingPkg.id);
      pkg = existingPkg;
    } else {
      const { data, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: def.packageKey, display_name: def.packageName },
      });
      if (error) throw new Error(`Failed to create package ${def.packageKey}: ${JSON.stringify(error)}`);
      console.log(`Created package ${def.packageKey}:`, data.id);
      pkg = data;
    }

    const ids = productMap[def.packageKey];
    if (ids) {
      const { error: attachPkgError } = await attachProductsToPackage({
        client,
        path: { project_id: project.id, package_id: pkg.id },
        body: {
          products: [
            { product_id: ids.iosId, eligibility_criteria: "all" },
            { product_id: ids.androidId, eligibility_criteria: "all" },
          ],
        },
      });
      if (attachPkgError) {
        const typed = attachPkgError as { type?: string };
        if (typed.type === "unprocessable_entity_error") {
          console.log(`Products already attached to package ${def.packageKey}`);
        } else {
          console.warn(`Warning attaching products to package ${def.packageKey}:`, JSON.stringify(attachPkgError));
        }
      } else {
        console.log(`Attached products to package ${def.packageKey}`);
      }
    }
  }

  // ── API Keys ──────────────────────────────────────────────────────────────
  const { data: iosKeys, error: iosKeysErr } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp.id },
  });
  if (iosKeysErr) throw new Error(`Failed to list App Store API keys: ${JSON.stringify(iosKeysErr)}`);

  const { data: androidKeys, error: androidKeysErr } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp.id },
  });
  if (androidKeysErr) throw new Error(`Failed to list Play Store API keys: ${JSON.stringify(androidKeysErr)}`);

  console.log("\n==================================================");
  console.log("TwinTrack RevenueCat setup complete!");
  console.log("==================================================");
  console.log("Project ID:              ", project.id);
  console.log("App Store App ID:        ", appStoreApp.id);
  console.log("Play Store App ID:       ", playStoreApp.id);
  console.log("Entitlement:             ", ENTITLEMENT_IDENTIFIER);
  console.log("Offering:                ", OFFERING_IDENTIFIER);
  console.log("--------------------------------------------------");
  console.log("App Store API Key:       ", iosKeys?.items?.map((k) => k.key).join(", ") ?? "N/A");
  console.log("Play Store API Key:      ", androidKeys?.items?.map((k) => k.key).join(", ") ?? "N/A");
  console.log("==================================================");
  console.log("\nNext steps:");
  console.log("1. Copy the IDs above into these env vars:");
  console.log("   REVENUECAT_PROJECT_ID =", project.id);
  console.log("   REVENUECAT_APPLE_APP_STORE_APP_ID =", appStoreApp.id);
  console.log("   REVENUECAT_GOOGLE_PLAY_STORE_APP_ID =", playStoreApp.id);
  console.log("2. Copy the public API keys into:");
  console.log("   VITE_REVENUECAT_IOS_API_KEY =", iosKeys?.items?.[0]?.key ?? "N/A");
  console.log("   VITE_REVENUECAT_ANDROID_API_KEY =", androidKeys?.items?.[0]?.key ?? "N/A");
  console.log("3. Set VITE_PREMIUM_ENABLED=true when ready to go live.");
  console.log("==================================================\n");
}

seedRevenueCat().catch((e) => {
  console.error(e);
  process.exit(1);
});
