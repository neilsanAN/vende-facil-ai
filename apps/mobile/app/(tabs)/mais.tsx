import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

const links = ["Loja, equipe e configurações ficam nesta conta.", "A câmera do anúncio abre no celular quando o anúncio é criado."];

export default function MoreScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 12 }}>Mais</Text>
      {links.map((item) => (
        <Text key={item} style={{ color: colors.textSecondary, fontSize: fonts.body, marginBottom: 8 }}>{item}</Text>
      ))}
      <Pressable
        onPress={async () => {
          await SecureStore.deleteItemAsync("vf_access");
          await SecureStore.deleteItemAsync("vf_refresh");
          router.replace("/");
        }}
        style={{ marginTop: 16, height: control.height, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Sair</Text>
      </Pressable>
    </View>
  );
}
