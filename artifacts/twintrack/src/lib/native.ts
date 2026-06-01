/**
 * Capacitor native platform detection.
 * Use this to branch between web and native behaviour without importing
 * the full @capacitor/core package in every file.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "ios" | "android" | "web";
};

function cap(): CapacitorGlobal | undefined {
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when running inside a Capacitor iOS or Android container. */
export function isNativePlatform(): boolean {
  return !!cap()?.isNativePlatform?.();
}

/** "ios" | "android" | "web" */
export function getNativePlatform(): "ios" | "android" | "web" {
  return cap()?.getPlatform?.() ?? "web";
}
