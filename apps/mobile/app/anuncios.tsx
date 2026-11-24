import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

export default function AdScreen() {
  const [message, setMessage] = useState("A foto fica neste aparelho até o envio para a loja.");
  const [uri, setUri] = useState<string | null>(null);

  async function open(camera: boolean) {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage(camera ? "A câmera não foi autorizada." : "A galeria não foi autorizada.");
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled) return;
    const photo = result.assets[0]?.uri || null;
    setUri(photo);
    setMessage("Foto escolhida. O anúncio com IA usa essa imagem junto dos fatos que você confirmar.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Pressable onPress={() => router.replace("/inicio")} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12, alignSelf: "flex-start" }}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Voltar</Text>
      </Pressable>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Foto do produto</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginTop: 6, marginBottom: 16 }}>{message}</Text>
      {uri ? <View style={{ height: 220, borderRadius: 16, backgroundColor: colors.surface, marginBottom: 16, borderWidth: 1, borderColor: colors.border }} /> : null}
      <Pressable onPress={() => void open(true)} style={{ height: control.height, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "white", fontSize: fonts.body, fontWeight: "600" }}>Câmera</Text>
      </Pressable>
      <Pressable onPress={() => void open(false)} style={{ marginTop: 8, height: control.height, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Galeria</Text>
      </Pressable>
    </View>
  );
}
