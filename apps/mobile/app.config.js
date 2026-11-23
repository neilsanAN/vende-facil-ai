/**
 * Um APK (canal preview) e um AAB (canal production).
 * Telas e correções de JS saem por OTA no mesmo canal.
 * Novo binário só quando mudar versão nativa, permissão ou biblioteca nativa.
 *
 * Depois de `eas init`, grave o id em EXPO_PUBLIC_EAS_PROJECT_ID
 * (segredo do EAS ou ambiente). Sem esse id o binário não recebe OTA.
 */
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "";

module.exports = {
  expo: {
    name: "VendeFácil AI",
    slug: "vendefacil",
    scheme: "vendefacil",
    owner: process.env.EXPO_OWNER || undefined,
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "ai.vendefacil.app",
      infoPlist: {
        NSCameraUsageDescription: "A VendeFácil AI usa a câmera para fotografar o produto do anúncio.",
        NSPhotoLibraryUsageDescription: "A VendeFácil AI usa a galeria para escolher a foto do produto.",
      },
    },
    android: {
      package: "ai.vendefacil.app",
      versionCode: 1,
      softwareKeyboardLayoutMode: "pan",
      permissions: ["CAMERA"],
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
    },
    runtimeVersion: { policy: "appVersion" },
    updates: projectId
      ? {
          url: `https://u.expo.dev/${projectId}`,
          enabled: true,
          checkAutomatically: "ON_LOAD",
          fallbackToCacheTimeout: 0,
        }
      : {
          enabled: false,
          checkAutomatically: "ON_LOAD",
          fallbackToCacheTimeout: 0,
        },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
      eas: projectId ? { projectId } : {},
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-updates",
      [
        "expo-image-picker",
        {
          cameraPermission: "A VendeFácil AI usa a câmera para fotografar o produto do anúncio.",
          photosPermission: "A VendeFácil AI usa a galeria para escolher a foto do produto.",
        },
      ],
    ],
    experiments: { typedRoutes: false },
  },
};
