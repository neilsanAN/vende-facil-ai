import { Linking, NativeModules, Platform, Share, TurboModuleRegistry } from "react-native";
import { getItem } from "./storage";

function stripLinks(text: string) {
  return text.replace(/https?:\/\/\S+/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildAdCaption(ad: { title: string; description: string; hashtags?: string[] | string | null }) {
  const raw = ad.hashtags;
  const list = Array.isArray(raw) ? raw : typeof raw === "string" && raw.trim() ? raw.split(/[\s,]+/).filter(Boolean) : [];
  const tags = list.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  return [ad.title.trim(), "", ad.description.trim(), tags ? `\n${tags}` : ""].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function hasNative(name: string) {
  try {
    return Boolean(TurboModuleRegistry.get(name) || (NativeModules as Record<string, unknown>)[name]);
  } catch {
    return Boolean((NativeModules as Record<string, unknown>)[name]);
  }
}

async function copyCaption(caption: string) {
  if (!caption || !hasNative("ExpoClipboard")) return false;
  try {
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(caption);
    return true;
  } catch {
    return false;
  }
}

/** Baixa as fotos para o cache local. Nunca derruba a tela se o módulo nativo faltar. */
async function downloadAll(uris: string[]): Promise<string[]> {
  const local: string[] = [];
  let FileSystem: typeof import("expo-file-system") | null = null;
  try {
    FileSystem = await import("expo-file-system");
  } catch {
    FileSystem = null;
  }
  const token = await getItem("vf_access").catch(() => null);
  for (const [index, uri] of uris.entries()) {
    if (uri.startsWith("file://") || uri.startsWith("content://")) {
      local.push(uri);
      continue;
    }
    if (!/^https?:\/\//.test(uri) || !FileSystem?.cacheDirectory || typeof FileSystem.downloadAsync !== "function") continue;
    try {
      const dest = `${FileSystem.cacheDirectory}anuncio-${Date.now()}-${index + 1}.jpg`;
      const result = await FileSystem.downloadAsync(uri, dest, token ? { headers: { authorization: `Bearer ${token}` } } : undefined);
      if (result?.status && result.status >= 400) continue;
      if (result?.uri) local.push(result.uri);
    } catch {
      // segue com as demais fotos
    }
  }
  return local;
}

type ShareResult = { images: number; captionCopied: boolean };

async function shareWithRNShare(channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK", files: string[], caption: string) {
  if (!hasNative("RNShare")) return false;
  try {
    const RNShare = (await import("react-native-share")).default;
    const common = {
      urls: files,
      type: "image/jpeg",
      message: caption,
      failOnCancel: false,
    };
    if (channel === "WHATSAPP") {
      try {
        await RNShare.shareSingle({ ...common, social: RNShare.Social.WHATSAPP } as never);
        return true;
      } catch {
        try {
          await RNShare.shareSingle({ ...common, social: RNShare.Social.WHATSAPPBUSINESS } as never);
          return true;
        } catch {
          // WhatsApp não encontrado direto: abre a folha de compartilhar.
        }
      }
    }
    await RNShare.open({ ...common, title: "Enviar anúncio" } as never);
    return true;
  } catch {
    return false;
  }
}

async function shareFirstImageFallback(file: string, caption: string) {
  if (!hasNative("ExpoSharing")) return false;
  try {
    const Sharing = await import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(file, { mimeType: "image/jpeg", dialogTitle: "Enviar anúncio" });
    if (caption) await Share.share({ message: caption }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compartilha o anúncio exatamente como foi criado: todas as fotos + título, descrição e hashtags.
 * O texto também vai para a área de transferência (se o app de destino ignorar a legenda, é só colar).
 */
export async function shareAdToChannel(options: {
  channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
  caption: string;
  imageUris?: Array<string | null | undefined>;
  whatsappUrl?: string | null;
}): Promise<ShareResult> {
  const caption = stripLinks(options.caption || "");
  const captionCopied = await copyCaption(caption);
  const uris = [...new Set((options.imageUris || []).filter((item): item is string => Boolean(item)))];
  const files = uris.length ? await downloadAll(uris) : [];

  if (files.length && (await shareWithRNShare(options.channel, files, caption))) {
    return { images: files.length, captionCopied };
  }

  if (files[0] && (await shareFirstImageFallback(files[0], caption))) {
    return { images: 1, captionCopied };
  }

  if (files[0] && Platform.OS === "ios") {
    try {
      await Share.share({ message: caption, url: files[0] });
      return { images: 1, captionCopied };
    } catch {
      // segue
    }
  }

  if (options.channel === "WHATSAPP" && options.whatsappUrl) {
    try {
      if (await Linking.canOpenURL(options.whatsappUrl)) {
        await Linking.openURL(options.whatsappUrl);
        return { images: 0, captionCopied };
      }
    } catch {
      // segue
    }
  }

  if (caption) await Share.share({ message: caption });
  return { images: 0, captionCopied };
}
