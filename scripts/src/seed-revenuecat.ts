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

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testApp) throw new Error("No test store app found");
  console.log("Test store app:", testApp.id);

  if (!appStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
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
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = data;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app found:", playStoreApp.id);
  }

  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeIdentifier: string,
    def: ProductDef,
    isTestStore: boolean,
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
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
    if (isTestStore) {
      body.subscription = { duration: def.duration };
      body.title = def.title;
    }

    const { data, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${label} product`);
    console.log(`Created ${label} product:`, data.id);
    return data;
  };

  const productIds: string[] = [];

  for (const def of PRODUCTS) {
    const testProduct = await ensureProduct(testApp, `Test/${def.id}`, def.id, def, true);
    const iosProduct = await ensureProduct(appStoreApp, `iOS/${def.id}`, def.id, def, false);
    const androidProduct = await ensureProduct(playStoreApp, `Android/${def.id}`, def.playId, def, false);

    const amountMicros = def.priceCents * 10000;
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testProduct.id },
      body: { prices: [{ amount_micros: amountMicros, currency: "USD" }] },
    });
    if (priceError) {
      const typed = priceError as { type?: string };
      if (typed.type === "resource_already_exists") {
        console.log(`Test store prices already exist for ${def.id}`);
      } else {
        throw new Error(`Failed to add test store prices for ${def.id}`);
      }
    } else {
      console.log(`Added test store prices for ${def.id}: $${def.priceCents / 100}`);
    }

    productIds.push(testProduct.id, iosProduct.id, androidProduct.id);
  }

  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
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
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached all products to entitlement");
  }

  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", data.id);
    offering = data;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  for (const def of PRODUCTS) {
    const existingPkg = existingPackages.items?.find((p) => p.lookup_key === def.packageKey);

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
      if (error) throw new Error(`Failed to create package ${def.packageKey}`);
      console.log(`Created package ${def.packageKey}:`, data.id);
      pkg = data;
    }

    const testProduct = existingProducts.items?.find(
      (p) => p.store_identifier === def.id && p.app_id === testApp!.id,
    );
    const iosProduct = existingProducts.items?.find(
      (p) => p.store_identifier === def.id && p.app_id === appStoreApp!.id,
    );
    const androidProduct = existingProducts.items?.find(
      (p) => p.store_identifier === def.playId && p.app_id === playStoreApp!.id,
    );

    if (testProduct && iosProduct && androidProduct) {
      const { error: attachPkgError } = await attachProductsToPackage({
        client,
        path: { project_id: project.id, package_id: pkg.id },
        body: {
          products: [
            { product_id: testProduct.id, eligibility_criteria: "all" },
            { product_id: iosProduct.id, eligibility_criteria: "all" },
            { product_id: androidProduct.id, eligibility_criteria: "all" },
          ],
        },
      });
      if (attachPkgError) {
        const typed = attachPkgError as { type?: string; message?: string };
        if (typed.type === "unprocessable_entity_error") {
          console.log(`Products already attached to package ${def.packageKey}`);
        } else {
          throw new Error(`Failed to attach products to package ${def.packageKey}`);
        }
      } else {
        console.log(`Attached products to package ${def.packageKey}`);
      }
    }
  }

  const { data: testKeys, error: testKeysErr } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: testApp.id },
  });
  if (testKeysErr) throw new Error("Failed to list test store API keys");

  const { data: iosKeys, error: iosKeysErr } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp.id },
  });
  if (iosKeysErr) throw new Error("Failed to list App Store API keys");

  const { data: androidKeys, error: androidKeysErr } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp.id },
  });
  if (androidKeysErr) throw new Error("Failed to list Play Store API keys");

  console.log("\n==================================================");
  console.log("TwinTrack RevenueCat setup complete!");
  console.log("==================================================");
  console.log("Project ID:              ", project.id);
  console.log("Test Store App ID:       ", testApp.id);
  console.log("App Store App ID:        ", appStoreApp.id);
  console.log("Play Store App ID:       ", playStoreApp.id);
  console.log("Entitlement:             ", ENTITLEMENT_IDENTIFIER);
  console.log("Offering:                ", OFFERING_IDENTIFIER);
  console.log("--------------------------------------------------");
  console.log("Test Store API Key:      ", testKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("App Store API Key:       ", iosKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("Play Store API Key:      ", androidKeys?.items.map((k) => k.key).join(", ") ?? "N/A");
  console.log("==================================================");
  console.log("\nNext steps:");
  console.log("1. Copy the IDs above into these env vars:");
  console.log("   REVENUECAT_PROJECT_ID");
  console.log("   REVENUECAT_TEST_STORE_APP_ID");
  console.log("   REVENUECAT_APPLE_APP_STORE_APP_ID");
  console.log("   REVENUECAT_GOOGLE_PLAY_STORE_APP_ID");
  console.log("2. Copy the API keys into these env vars:");
  console.log("   VITE_REVENUECAT_TEST_API_KEY");
  console.log("   VITE_REVENUECAT_IOS_API_KEY");
  console.log("   VITE_REVENUECAT_ANDROID_API_KEY");
  console.log("3. Set VITE_PREMIUM_ENABLED=true when ready to go live.");
  console.log("==================================================\n");
}

seedRevenueCat().catch(console.error);
