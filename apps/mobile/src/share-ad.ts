import { Platform, Share } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

function stripLinks(text: string) {
  return text.replace(/https?:\/\/\S+/gi, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildAdCaption(ad: { title: string; description: string; hashtags?: string[] }) {
  const tags = (ad.hashtags || []).map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  return [ad.title.trim(), "", ad.description.trim(), tags ? `\n${tags}` : ""].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Baixa a capa (se for http) para arquivo local, pronto para compartilhar. */
export async function resolveLocalImage(uri: string | null | undefined) {
  if (!uri) return null;
  if (uri.startsWith("file://") || uri.startsWith("content://")) return uri;
  if (!uri.startsWith("http")) return uri;
  const destination = new File(Paths.cache, `share-ad-${Date.now()}.jpg`);
  const downloaded = await File.downloadFileAsync(uri, destination, { idempotent: true });
  return downloaded.uri;
}

/**
 * Compartilha o anúncio idêntico: texto + imagem.
 * No WhatsApp, tenta anexar a foto com a legenda.
 */
export async function shareAdToChannel(options: {
  channel: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
  caption: string;
  imageUri?: string | null;
  whatsappUrl?: string | null;
}) {
  const caption = stripLinks(options.caption);
  const localImage = await resolveLocalImage(options.imageUri || null);

  if (options.channel === "WHATSAPP") {
    if (localImage) {
      try {
        await Share.share(
          Platform.OS === "ios"
            ? { message: caption, url: localImage }
            : { message: caption, url: localImage, title: "Anúncio" },
        );
        return;
      } catch {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localImage, { mimeType: "image/jpeg", dialogTitle: "Enviar anúncio" });
          await Share.share({ message: caption });
          return;
        }
      }
    }
    if (options.whatsappUrl) {
      // Fallback só texto (sem link no caption — a URL do wa.me só carrega a mensagem).
      const { Linking } = await import("react-native");
      const can = await Linking.canOpenURL(options.whatsappUrl);
      if (can) {
        await Linking.openURL(options.whatsappUrl);
        return;
      }
    }
    await Share.share({ message: caption });
    return;
  }

  if (localImage) {
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { message: caption, url: localImage }
          : { message: caption, url: localImage, title: "Anúncio" },
      );
      return;
    } catch {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localImage, { mimeType: "image/jpeg", dialogTitle: "Publicar anúncio" });
        await Share.share({ message: caption });
        return;
      }
    }
  }
  await Share.share({ message: caption });
}
