import { Linking, Platform, Share } from "react-native";

function stripLinks(text: string) {
  return text.replace(/https?:\/\/\S+/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildAdCaption(ad: { title: string; description: string; hashtags?: string[] | string | null }) {
  const raw = ad.hashtags;
  const list = Array.isArray(raw) ? raw : typeof raw === "string" && raw.trim() ? raw.split(/[\s,]+/).filter(Boolean) : [];
  const tags = list.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  return [ad.title.trim(), "", ad.description.trim(), tags ? `\n${tags}` : ""].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Baixa http(s) para cache local. Nunca derruba a tela se o módulo nativo faltar. */
async function downloadToCache(uri: string): Promise<string | null> {
  try {
    // SDK 53: API clássica (downloadAsync). Sem File/Paths do SDK 54+.
    const FileSystem = await import("expo-file-system");
    const cache = (FileSystem as { cacheDirectory?: string | null }).cacheDirectory;
    const downloadAsync = (FileSystem as { downloadAsync?: (url: string, fileUri: string) => Promise<{ uri: string }> }).downloadAsync;
    if (!cache || typeof downloadAsync !== "function") return null;
    const dest = `${cache}share-ad-${Date.now()}.jpg`;
    const result = await downloadAsync(uri, dest);
    return result?.uri || null;
  } catch {
    return null;
  }
}

async function resolveLocalImage(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith("file://") || uri.startsWith("content://")) return uri;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return downloadToCache(uri);
  return null;
}

async function shareLocalImage(localImage: string, caption: string): Promise<boolean> {
  try {
    const Sharing = await import("expo-sharing");
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localImage, {
        mimeType: "image/jpeg",
        dialogTitle: "Enviar anúncio",
      });
      // WhatsApp/Android muitas vezes abre só a foto — reenvia o texto em seguida.
      if (caption) {
        await Share.share({ message: caption }).catch(() => undefined);
      }
      return true;
    }
  } catch {
    // Módulo nativo ausente no APK atual — segue fallback.
  }

  try {
    if (Platform.OS === "ios") {
      await Share.share({ message: caption, url: localImage });
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Compartilha o anúncio idêntico: texto (+ imagem quando o nativo permitir).
 * À prova de falha: sem módulo nativo, abre o texto no WhatsApp/Share sem quebrar a tela.
 */
export async function shareAdToChannel(options: {
  channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
  caption: string;
  imageUri?: string | null;
  whatsappUrl?: string | null;
}) {
  const caption = stripLinks(options.caption || "");
  const localImage = await resolveLocalImage(options.imageUri || null);

  if (localImage) {
    const shared = await shareLocalImage(localImage, caption);
    if (shared) return;
  }

  if (options.channel === "WHATSAPP" && options.whatsappUrl) {
    try {
      const can = await Linking.canOpenURL(options.whatsappUrl);
      if (can) {
        await Linking.openURL(options.whatsappUrl);
        return;
      }
    } catch {
      // ignore
    }
  }

  if (caption) {
    await Share.share({ message: caption });
  }
}
