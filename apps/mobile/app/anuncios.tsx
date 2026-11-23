import { Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { useState } from "react";

export default function AdScreen() {
  const [message, setMessage] = useState("A foto fica neste aparelho até o envio para a loja.");
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
    setMessage("Foto escolhida. O anúncio com IA usa essa imagem junto dos fatos que você confirmar.");
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: "center", gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700" }}>Foto do produto</Text>
      <Text style={{ color: colors.textSecondary, fontSize: fonts.body, marginBottom: 8 }}>{message}</Text>
      <Pressable onPress={() => void open(true)} style={{ height: control.height, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "white", fontSize: fonts.body, fontWeight: "600" }}>Câmera</Text>
      </Pressable>
      <Pressable onPress={() => void open(false)} style={{ height: control.height, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Galeria</Text>
      </Pressable>
    </View>
  );
}
