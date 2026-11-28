import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";

const items = [
  { href: "/estudio/video/novo", label: "Criar vídeos profissionais com IA", text: "Com narração, artes e exportação para redes", icon: "videocam-outline" as const },
  { href: "/estudio/publicar", label: "Publicar nas redes", text: "WhatsApp, Instagram e Facebook", icon: "share-social-outline" as const },
  { href: "/anuncios/novo", label: "Criar anúncio com IA", text: "Título, descrição e hashtags", icon: "sparkles-outline" as const },
  { href: "/estudio/historico", label: "Meus projetos", text: "Vídeos, artes e rascunhos", icon: "folder-outline" as const },
] as const;

export default function EstudioScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 40 }}
    >
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 14 }}>Estúdio IA</Text>
      {items.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => router.push(item.href)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={item.icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700" }}>{item.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 3 }}>{item.text}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.border} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
