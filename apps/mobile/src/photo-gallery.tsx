import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, fonts } from "@vendefacil/ui-tokens";

export const MAX_PRODUCT_PHOTOS = 30;

export type LocalPhoto = {
  key: string;
  uri: string;
  mimeType: string;
};

type Props = {
  photos: LocalPhoto[];
  onChange: (next: LocalPhoto[]) => void;
  max?: number;
  emptyLabel?: string;
  onError?: (message: string) => void;
};

export async function pickPhotos(options: {
  camera: boolean;
  currentCount: number;
  max?: number;
}): Promise<LocalPhoto[]> {
  const max = options.max ?? MAX_PRODUCT_PHOTOS;
  const remaining = Math.max(0, max - options.currentCount);
  if (remaining <= 0) return [];

  const permission = options.camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(options.camera ? "Autorize a câmera." : "Autorize a galeria.");
  }

  if (options.camera) {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.uri) return [];
    const asset = result.assets[0];
    return [
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uri: asset.uri,
        mimeType: asset.mimeType || "image/jpeg",
      },
    ];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsMultipleSelection: true,
    selectionLimit: remaining,
  });
  if (result.canceled) return [];
  return result.assets
    .filter((asset) => Boolean(asset.uri))
    .slice(0, remaining)
    .map((asset, index) => ({
      key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      uri: asset.uri,
      mimeType: asset.mimeType || "image/jpeg",
    }));
}

export function PhotoGallery({
  photos,
  onChange,
  max = MAX_PRODUCT_PHOTOS,
  emptyLabel = "Adicione até 30 fotos",
  onError,
}: Props) {
  const limit = Math.max(0, max);
  const full = limit === 0 || photos.length >= limit;

  async function add(camera: boolean) {
    if (limit <= 0) {
      onError?.("Limite de fotos atingido.");
      return;
    }
    try {
      const next = await pickPhotos({ camera, currentCount: photos.length, max: limit });
      if (!next.length) return;
      onChange([...photos, ...next].slice(0, limit));
    } catch (cause) {
      onError?.(cause instanceof Error ? cause.message : "Não foi possível abrir as fotos.");
    }
  }

  if (limit <= 0 && photos.length === 0) {
    return (
      <View style={{ borderRadius: 14, backgroundColor: colors.primarySoft, padding: 14 }}>
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Limite de 30 fotos atingido.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>Fotos</Text>
        <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>
          {photos.length}/{limit}
        </Text>
      </View>

      {photos.length === 0 ? (
        <Pressable
          onPress={() => void add(false)}
          style={{
            minHeight: 168,
            borderRadius: 18,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: "#D7D0EA",
            backgroundColor: "#F7F4FF",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            gap: 8,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="images-outline" size={24} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{emptyLabel}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fonts.body2, fontWeight: "500", textAlign: "center" }}>
            Escolha várias de uma vez na galeria
          </Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {photos.map((photo, index) => (
            <View
              key={photo.key}
              style={{
                width: "31.5%",
                aspectRatio: 1,
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: "#EEF0F5",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Image source={{ uri: photo.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              {index === 0 ? (
                <View
                  style={{
                    position: "absolute",
                    left: 6,
                    bottom: 6,
                    borderRadius: 999,
                    backgroundColor: "rgba(23,24,39,0.72)",
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>Capa</Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => onChange(photos.filter((item) => item.key !== photo.key))}
                hitSlop={8}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  backgroundColor: "rgba(15,12,30,0.72)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {!full ? (
            <Pressable
              onPress={() => void add(false)}
              style={{
                width: "31.5%",
                aspectRatio: 1,
                borderRadius: 14,
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "#D7D0EA",
                backgroundColor: "#F7F4FF",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <Ionicons name="add" size={22} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: fonts.caption, fontWeight: "700" }}>Mais</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => void add(true)}
          disabled={full}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 999,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: full ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "700" }}>Câmera</Text>
        </Pressable>
        <Pressable
          onPress={() => void add(false)}
          disabled={full}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: full ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700" }}>Galeria</Text>
        </Pressable>
      </View>
    </View>
  );
}
