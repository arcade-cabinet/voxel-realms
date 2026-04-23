import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.arcadecabinet.voxelrealms",
  appName: "Voxel Realms",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#07090d",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#07090d",
      overlaysWebView: true,
    },
    CapacitorSQLite: {
      iosDatabaseLocation: "Library/CapacitorDatabase",
      iosIsEncryption: false,
      iosKeychainPrefix: "voxel-realms",
      androidIsEncryption: false,
    },
  },
};

export default config;
