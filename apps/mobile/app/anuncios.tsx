import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

export default function AdScreen() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("Tire uma foto ou escolha da galeria para a IA criar o anúncio.");
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(camera: boolean) {
    setBusy(true);
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage(camera ? "Autorize a câmera nas configurações do aparelho." : "Autorize a galeria nas configurações do aparelho.");
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [4, 5] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [4, 5] });
      if (result.canceled) return;
      const photo = result.assets[0]?.uri || null;
      setUri(photo);
      setMessage("Foto pronta. Confirme os fatos e gere o anúncio com IA.");
    } catch {
      setMessage("Não foi possível abrir a câmera ou a galeria neste aparelho.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 16 }}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{
          height: 44,
          width: 44,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>

      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Criar anúncio com IA</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 6, marginBottom: 16 }}>{message}</Text>

      <View
        style={{
          aspectRatio: 4 / 5,
          borderRadius: 22,
          borderWidth: 2,
          borderStyle: uri ? "solid" : "dashed",
          borderColor: uri ? colors.border : "#D9CFFF",
          backgroundColor: uri ? colors.surface : "#F7F4FF",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <>
            <Ionicons name="camera-outline" size={36} color={colors.primary} />
            <Text style={{ marginTop: 10, color: colors.text, fontSize: fonts.subtitle, fontWeight: "500", textAlign: "center", maxWidth: 220 }}>
              Tire uma foto do produto ou escolha da galeria
            </Text>
          </>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          disabled={busy}
          onPress={() => void open(true)}
          style={{
            flex: 1,
            minHeight: 96,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="camera" size={22} color="#fff" />}
          <Text style={{ color: "#fff", fontSize: fonts.body, fontWeight: "600" }}>Câmera</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => void open(false)}
          style={{
            flex: 1,
            minHeight: 96,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Ionicons name="images-outline" size={22} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Galeria</Text>
        </Pressable>
      </View>

      <Pressable
        disabled={!uri || busy}
        onPress={() => router.push("/inicio")}
        style={{
          marginTop: 14,
          height: control.height,
          borderRadius: 999,
          backgroundColor: uri ? colors.primary : "#E8EAF0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: uri ? "#fff" : colors.textSecondary, fontSize: fonts.body, fontWeight: "600" }}>Gerar com IA</Text>
      </Pressable>
    </View>
  );
}
