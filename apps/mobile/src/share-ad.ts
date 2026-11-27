import { formatWhatsAppPost } from "@vendefacil/types";
import { Linking, Platform, Share, TurboModuleRegistry, NativeModules } from "react-native";
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

export function buildAdCaption(ad: {
  title: string;
  description: string;
  hashtags?: string[] | string | null;
  storeName?: string | null;
  priceLabel?: string | null;
  compareAtLabel?: string | null;
  includeStore?: boolean;
}) {
  return formatWhatsAppPost(
    {
      storeName: ad.storeName,
      title: ad.title,
      description: ad.description,
      hashtags: ad.hashtags,
      priceLabel: ad.priceLabel,
      compareAtLabel: ad.compareAtLabel,
    },
    { includeStore: ad.includeStore },
  );
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

/** Absolute path → file:// so Sharing / RNShare accept it. */
function toFileUri(pathOrUri: string): string {
  const t = pathOrUri.trim();
  if (!t) return t;
  if (/^(file|content|https?|ph|assets-library):\/\//i.test(t)) return t;
  if (t.startsWith("/")) return `file://${t}`;
  return t;
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

type ImageKind = { ext: string; mime: string };
type LocalImage = { uri: string; mime: string };

function kindFromSample(sample: string): ImageKind | null {
  if (sample.startsWith("/9j/")) return { ext: ".jpg", mime: "image/jpeg" };
  if (sample.startsWith("iVBORw")) return { ext: ".png", mime: "image/png" };
  if (sample.startsWith("UklGR")) return { ext: ".webp", mime: "image/webp" };
  if (sample.startsWith("R0lGOD")) return { ext: ".gif", mime: "image/gif" };
  return null;
}

async function sniffImage(fileUri: string, FileSystem: { readAsStringAsync: (uri: string, options: { encoding: "base64"; position?: number; length?: number }) => Promise<string> }) {
  try {
    const sample = await FileSystem.readAsStringAsync(fileUri, { encoding: "base64", position: 0, length: 24 });
    return kindFromSample(sample);
  } catch {
    try {
      const all = await FileSystem.readAsStringAsync(fileUri, { encoding: "base64" });
      return kindFromSample(all.slice(0, 32));
    } catch {
      return null;
    }
  }
}

async function discard(FileSystem: { deleteAsync?: (uri: string, options?: { idempotent?: boolean }) => Promise<void> }, uri: string) {
  try {
    await FileSystem.deleteAsync?.(uri, { idempotent: true });
  } catch {
    // ignore
  }
}

/**
 * Garante um arquivo local com extensão real (jpg/png/webp).
 * WhatsApp recusa foto salva como .jpg quando o conteúdo é png/webp.
 */
async function materialize(
  sourceUri: string,
  index: number,
  FileSystem: Awaited<ReturnType<typeof getFileSystem>>,
): Promise<LocalImage | null> {
  if (!FileSystem?.cacheDirectory) return null;
  const kind = await sniffImage(sourceUri, FileSystem);
  if (!kind) {
    await discard(FileSystem, sourceUri);
    return null;
  }
  const dest = `${FileSystem.cacheDirectory}anuncio-${Date.now()}-${index + 1}${kind.ext}`;
  try {
    if (sourceUri === dest) return { uri: toFileUri(dest), mime: kind.mime };
    await FileSystem.moveAsync({ from: sourceUri, to: dest });
    return { uri: toFileUri(dest), mime: kind.mime };
  } catch {
    return { uri: toFileUri(sourceUri), mime: kind.mime };
  }
}

async function downloadOne(uri: string, index: number): Promise<LocalImage | null> {
  const raw = uri.trim();
  if (!raw) return null;

  const FileSystem = await getFileSystem();
  if (!FileSystem?.cacheDirectory) {
    if (/^file:\/\//i.test(raw) || (raw.startsWith("/") && !raw.startsWith("//"))) {
      return { uri: toFileUri(raw), mime: "image/jpeg" };
    }
    return null;
  }

  const scratch = `${FileSystem.cacheDirectory}anuncio-src-${Date.now()}-${index}.bin`;

  if (/^content:\/\//i.test(raw)) {
    try {
      await FileSystem.copyAsync({ from: raw, to: scratch });
      return await materialize(scratch, index, FileSystem);
    } catch {
      return null;
    }
  }

  if (/^file:\/\//i.test(raw) || (raw.startsWith("/") && !raw.startsWith("//"))) {
    const fileUri = toFileUri(raw);
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists || (info.size != null && info.size < 32)) return null;
    } catch {
      return null;
    }
    try {
      await FileSystem.copyAsync({ from: fileUri, to: scratch });
      return await materialize(scratch, index, FileSystem);
    } catch {
      const kind = await sniffImage(fileUri, FileSystem);
      return kind ? { uri: fileUri, mime: kind.mime } : null;
    }
  }

  if (!/^https?:\/\//i.test(raw)) return null;

  const signed = /[?&]sig=/.test(raw);
  const token = signed ? null : await getItem("vf_access").catch(() => null);
  const headers = token ? { authorization: `Bearer ${token}` } : undefined;

  try {
    if (typeof FileSystem.downloadAsync === "function") {
      const result = await FileSystem.downloadAsync(raw, scratch, headers ? { headers } : undefined);
      if (result?.uri && (!result.status || result.status < 400)) {
        const ready = await materialize(result.uri, index, FileSystem);
        if (ready) return ready;
      }
    }
  } catch {
    // tenta fetch abaixo
  }

  try {
    const response = await fetch(raw, headers ? { headers } : undefined);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 32) return null;
    const Encoding = (FileSystem as { EncodingType?: { Base64: string } }).EncodingType;
    await FileSystem.writeAsStringAsync(scratch, toBase64(bytes), {
      encoding: (Encoding?.Base64 || "base64") as "base64",
    });
    return await materialize(scratch, index, FileSystem);
  } catch {
    await discard(FileSystem, scratch);
    return null;
  }
}

async function downloadAll(uris: string[]) {
  const local: LocalImage[] = [];
  const seen = new Set<string>();
  for (const [index, uri] of uris.entries()) {
    if (local.length >= 10) break;
    const key = uri.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const file = await downloadOne(key, index);
    if (file) local.push(file);
  }
  return local;
}

type ShareResult = { images: number; captionCopied: boolean };

function shareType(files: Array<{ mime: string }>) {
  const mimes = new Set(files.map((file) => file.mime));
  return mimes.size === 1 ? [...mimes][0] : "image/*";
}

async function shareWithRNShare(channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK", files: LocalImage[], caption: string) {
  if (!hasNative("RNShare") || !files.length) return false;
  try {
    const RNShare = (await import("react-native-share")).default;
    const type = shareType(files);
    const single = files.length === 1;
    // Uma foto: só `url`. `urls` força SEND_MULTIPLE e o WhatsApp deixa a imagem de fora.
    const payload = single
      ? {
          url: files[0].uri,
          type: files[0].mime,
          message: caption,
          filename: `anuncio${files[0].mime === "image/png" ? ".png" : files[0].mime === "image/webp" ? ".webp" : ".jpg"}`,
          useInternalStorage: true,
          failOnCancel: false,
        }
      : {
          // Sem `filenames`: no Android esse campo vira uma subpasta do arquivo e a foto some.
          urls: files.map((file) => file.uri),
          type,
          message: caption,
          useInternalStorage: true,
          failOnCancel: false,
        };

    if (channel === "WHATSAPP") {
      const socials = [RNShare.Social.WHATSAPP, RNShare.Social.WHATSAPPBUSINESS];
      for (const social of socials) {
        try {
          await RNShare.shareSingle({ ...payload, social } as never);
          return true;
        } catch {
          // tenta o outro app ou a folha
        }
      }
    }

    await RNShare.open(payload as never);
    return true;
  } catch {
    return false;
  }
}

/** Caminho que o react-native-share grava de novo via FileProvider. Usado se o file:// não anexar. */
async function shareViaDataUri(files: LocalImage[], caption: string) {
  if (!hasNative("RNShare")) return false;
  const FileSystem = await getFileSystem();
  if (!FileSystem) return false;
  try {
    const packed: Array<{ url: string; name: string; mime: string }> = [];
    for (const file of files.slice(0, 4)) {
      const info = await FileSystem.getInfoAsync(file.uri);
      if (!info.exists || (info.size != null && info.size > 2_500_000)) continue;
      const Encoding = (FileSystem as { EncodingType?: { Base64: string } }).EncodingType;
      const data = await FileSystem.readAsStringAsync(file.uri, { encoding: (Encoding?.Base64 || "base64") as "base64" });
      if (!data) continue;
      const ext = file.mime === "image/png" ? "png" : file.mime === "image/webp" ? "webp" : "jpg";
      packed.push({ url: `data:${file.mime};base64,${data}`, name: `anuncio-${packed.length + 1}.${ext}`, mime: file.mime });
    }
    if (!packed.length) return false;
    const RNShare = (await import("react-native-share")).default;
    const single = packed.length === 1;
    const payload = single
      ? {
          url: packed[0].url,
          type: packed[0].mime,
          message: caption,
          filename: "anuncio",
          useInternalStorage: true,
          failOnCancel: false,
        }
      : {
          urls: packed.map((file) => file.url),
          type: shareType(packed),
          message: caption,
          filenames: packed.map((file) => file.name),
          useInternalStorage: true,
          failOnCancel: false,
        };
    for (const social of [RNShare.Social.WHATSAPP, RNShare.Social.WHATSAPPBUSINESS]) {
      try {
        await RNShare.shareSingle({ ...payload, social } as never);
        return true;
      } catch {
        // próxima tentativa
      }
    }
    await RNShare.open(payload as never);
    return true;
  } catch {
    return false;
  }
}

async function shareViaExpoSharing(files: LocalImage[], caption: string) {
  if (!hasNative("ExpoSharing") || !files[0]) return false;
  try {
    const Sharing = await import("expo-sharing");
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(toFileUri(files[0].uri), {
      mimeType: files[0].mime,
      dialogTitle: "Enviar anúncio no WhatsApp",
      UTI: "public.jpeg",
    });
    for (const extra of files.slice(1, 10)) {
      try {
        await Sharing.shareAsync(toFileUri(extra.uri), { mimeType: extra.mime, dialogTitle: "Enviar foto do anúncio" });
      } catch {
        break;
      }
    }
    if (caption) await Share.share({ message: caption }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

async function openWhatsAppText(whatsappUrl: string | null | undefined, caption: string) {
  const targets = [
    whatsappUrl,
    caption ? `whatsapp://send?text=${encodeURIComponent(caption)}` : null,
    caption ? `https://wa.me/?text=${encodeURIComponent(caption)}` : null,
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
  try {
    if (caption) {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(caption)}`);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Compartilha o anúncio: fotos reais + mensagem formatada.
 * Texto puro só quando nenhuma imagem pôde ser preparada.
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
  const remote = uris.filter((uri) => /^https?:\/\//i.test(uri));
  const signed = remote.filter((uri) => /[?&]sig=/.test(uri));
  const local = uris.filter((uri) => !/^https?:\/\//i.test(uri));
  let files = signed.length ? await downloadAll(signed) : [];
  if (!files.length && remote.length) files = await downloadAll(remote.filter((uri) => !signed.includes(uri)));
  if (!files.length && local.length) files = await downloadAll(local);

  if (files.length && (await shareWithRNShare(options.channel, files, caption))) {
    return { images: files.length, captionCopied };
  }

  if (files.length && options.channel === "WHATSAPP" && (await shareViaDataUri(files, caption))) {
    return { images: files.length, captionCopied };
  }

  if (files.length && (await shareViaExpoSharing(files, caption))) {
    return { images: files.length, captionCopied };
  }

  if (files[0] && Platform.OS === "ios") {
    try {
      await Share.share({ message: caption, url: files[0].uri, title: "Anúncio" });
      return { images: files.length, captionCopied };
    } catch {
      // segue
    }
  }

  if (!files.length && options.channel === "WHATSAPP") {
    if (await openWhatsAppText(options.whatsappUrl, caption)) {
      return { images: 0, captionCopied };
    }
  }

  if (caption) await Share.share({ message: caption }).catch(() => undefined);
  return { images: 0, captionCopied };
}
