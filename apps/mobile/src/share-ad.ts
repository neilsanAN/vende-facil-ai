import { Linking, NativeModules, Platform, Share, TurboModuleRegistry } from "react-native";
import { getItem } from "./storage";

function stripLinks(text: string) {
  return text
    .replace(/🔗\s*/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bwa\.me\/\S+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove texto genérico ruim que a IA antiga gerava. */
export function polishShareCaption(text: string) {
  return stripLinks(text)
    .replace(/^Produto\s*[-–—]\s*Saiba Mais.*$/gim, "")
    .replace(/\bSaiba Mais(?:\s+Detalhes)?\b/gi, "")
    .replace(/\bEntre em contato com a nossa equipe[^.]*\./gi, "")
    .replace(/\bpara obter mais informações[^.]*\./gi, "")
    .replace(/\besclarecer suas dúvidas[^.]*\./gi, "")
    .replace(/^#produto\s+#atendimento\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildAdCaption(ad: { title: string; description: string; hashtags?: string[] | string | null }) {
  const raw = ad.hashtags;
  const list = Array.isArray(raw) ? raw : typeof raw === "string" && raw.trim() ? raw.split(/[\s,]+/).filter(Boolean) : [];
  const generic = new Set(["produto", "atendimento", "oferta", "loja"]);
  const meaningful = list.map((tag) => tag.replace(/^#/, "").trim()).filter((tag) => tag && !generic.has(tag.toLowerCase()));
  const tags = (meaningful.length ? meaningful : list.map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean)).map((tag) => `#${tag}`);
  return polishShareCaption([ad.title.trim(), "", ad.description.trim(), tags.length ? `\n${tags.join(" ")}` : ""].join("\n"));
}

export function isGenericPlaceholderAd(ad: { title: string; description: string }) {
  const title = ad.title.toLowerCase();
  const description = ad.description.toLowerCase();
  if (title.includes("gerando anúncio")) return true;
  if (title.includes("saiba mais")) return true;
  if (description.includes("entre em contato com a nossa equipe")) return true;
  if (description.includes("edite o título, a descrição")) return true;
  return false;
}

function hasNative(name: string) {
  try {
    return Boolean(TurboModuleRegistry.get(name) || (NativeModules as Record<string, unknown>)[name]);
  } catch {
    return Boolean((NativeModules as Record<string, unknown>)[name]);
  }
}

function toBase64(bytes: Uint8Array) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += chars[a >> 2];
    out += chars[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? "=" : chars[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? "=" : chars[c & 63];
  }
  return out;
}

async function copyCaption(caption: string) {
  if (!caption) return false;
  try {
    if (hasNative("ExpoClipboard")) {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(caption);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

async function getFileSystem() {
  try {
    return await import("expo-file-system");
  } catch {
    return null;
  }
}

/** Baixa http(s) com fetch (segue redirect do R2) e grava no cache. */
async function downloadOne(uri: string, index: number): Promise<string | null> {
  if (uri.startsWith("file://") || uri.startsWith("content://")) return uri;
  if (!/^https?:\/\//.test(uri)) return null;

  const FileSystem = await getFileSystem();
  if (!FileSystem?.cacheDirectory) return null;

  const token = await getItem("vf_access").catch(() => null);
  const dest = `${FileSystem.cacheDirectory}anuncio-share-${Date.now()}-${index + 1}.jpg`;

  try {
    const response = await fetch(uri, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength) throw new Error("empty");
    const Encoding = (FileSystem as { EncodingType?: { Base64: string } }).EncodingType;
    await FileSystem.writeAsStringAsync(dest, toBase64(bytes), {
      encoding: (Encoding?.Base64 || "base64") as "base64",
    });
    return dest;
  } catch {
    // Fallback clássico do SDK 53
    try {
      if (typeof FileSystem.downloadAsync === "function") {
        const result = await FileSystem.downloadAsync(uri, dest, token ? { headers: { authorization: `Bearer ${token}` } } : undefined);
        if (result?.uri && (!result.status || result.status < 400)) return result.uri;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function downloadAll(uris: string[]) {
  const local: string[] = [];
  for (const [index, uri] of uris.entries()) {
    const file = await downloadOne(uri, index);
    if (file) local.push(file);
  }
  return local;
}

type ShareResult = { images: number; captionCopied: boolean };

async function shareWithRNShare(channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK", files: string[], caption: string) {
  if (!hasNative("RNShare")) return false;
  try {
    const RNShare = (await import("react-native-share")).default;
    const options = {
      urls: files,
      url: files[0],
      type: files.length > 1 ? "image/*" : "image/jpeg",
      message: caption,
      title: "Anúncio VendeFácil",
      failOnCancel: false,
      filename: "anuncio",
    };
    if (channel === "WHATSAPP") {
      try {
        await RNShare.shareSingle({ ...options, social: RNShare.Social.WHATSAPP, whatsAppNumber: undefined } as never);
        return true;
      } catch {
        try {
          await RNShare.shareSingle({ ...options, social: RNShare.Social.WHATSAPPBUSINESS } as never);
          return true;
        } catch {
          // abre a folha geral
        }
      }
    }
    await RNShare.open(options as never);
    return true;
  } catch {
    return false;
  }
}

async function shareViaExpoSharing(files: string[], caption: string) {
  if (!hasNative("ExpoSharing") || !files[0]) return false;
  try {
    const Sharing = await import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) return false;
    // Uma foto por vez — no Android o WhatsApp recebe a imagem; o texto já está na área de transferência.
    await Sharing.shareAsync(files[0], { mimeType: "image/jpeg", dialogTitle: "Enviar anúncio no WhatsApp" });
    if (caption && files.length === 1) {
      // Reforça o texto depois, se o usuário cancelar o share de texto tudo bem.
      await Share.share({ message: caption }).catch(() => undefined);
    }
    return true;
  } catch {
    return false;
  }
}

async function openWhatsAppText(whatsappUrl: string | null | undefined, caption: string) {
  const targets = [
    whatsappUrl,
    caption ? `https://wa.me/?text=${encodeURIComponent(caption)}` : null,
    caption ? `whatsapp://send?text=${encodeURIComponent(caption)}` : null,
  ].filter((item): item is string => Boolean(item));

  for (const url of targets) {
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // tenta o próximo
    }
  }
  return false;
}

/**
 * Compartilha o anúncio exatamente como foi criado: fotos + título/descrição/hashtags.
 * O texto também vai para a área de transferência.
 */
export async function shareAdToChannel(options: {
  channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
  caption: string;
  imageUris?: Array<string | null | undefined>;
  whatsappUrl?: string | null;
}): Promise<ShareResult> {
  const caption = polishShareCaption(options.caption || "");
  const captionCopied = await copyCaption(caption);
  const uris = [...new Set((options.imageUris || []).map((item) => item?.trim()).filter((item): item is string => Boolean(item)))];
  const files = uris.length ? await downloadAll(uris) : [];

  if (files.length && (await shareWithRNShare(options.channel, files, caption))) {
    return { images: files.length, captionCopied };
  }

  if (files.length && (await shareViaExpoSharing(files, caption))) {
    return { images: files.length, captionCopied };
  }

  if (files[0] && Platform.OS === "ios") {
    try {
      await Share.share({ message: caption, url: files[0] });
      return { images: 1, captionCopied };
    } catch {
      // segue
    }
  }

  if (options.channel === "WHATSAPP") {
    if (await openWhatsAppText(options.whatsappUrl, caption)) {
      return { images: files.length, captionCopied };
    }
  }

  if (caption) await Share.share({ message: caption });
  return { images: files.length, captionCopied };
}
