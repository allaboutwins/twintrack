import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.allaboutwins.twintrack",
  appName: "TwinTrack",
  webDir: "dist/public",

  // Server config for live-reload during development (comment out for production builds)
  // server: {
  //   url: "https://YOUR_REPLIT_DEV_URL",
  //   cleartext: true,
  // },

  ios: {
    contentInset: "always",
    backgroundColor: "#fdf8fa",
    preferredContentMode: "mobile",
    scrollEnabled: false,
    // limitsNavigationsToAppBoundDomains: true,
  },

  android: {
    backgroundColor: "#fdf8fa",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#fdf8fa",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      iosSpinnerStyle: "small",
      spinnerColor: "#da5a9f",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#da5a9f",
    },
    StatusBar: {
      style: "Default",
      backgroundColor: "#fdf8fa",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
