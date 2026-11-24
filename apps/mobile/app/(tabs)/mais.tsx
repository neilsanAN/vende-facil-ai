import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

const links = [
  { href: "/pedidos", label: "Pedidos" },
  { href: "/estatisticas", label: "Estatísticas" },
  { href: "/estudio", label: "Estúdio" },
] as const;

export default function MoreScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 12 }}>Mais</Text>
      {links.map((item) => (
        <Pressable
          key={item.href}
          onPress={() => router.push(item.href)}
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, marginBottom: 8 }}
        >
          <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "500" }}>{item.label}</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={async () => {
          await SecureStore.deleteItemAsync("vf_access");
          await SecureStore.deleteItemAsync("vf_refresh");
          router.replace("/");
        }}
        style={{ marginTop: 16, height: control.height, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}
      >
        <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>Sair</Text>
      </Pressable>
    </View>
  );
}
