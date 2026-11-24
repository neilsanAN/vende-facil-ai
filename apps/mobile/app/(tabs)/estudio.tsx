import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@vendefacil/ui-tokens";

const items = [
  { href: "/anuncios/novo", label: "Criar vídeo com IA", text: "Transforme fotos em um vídeo com voz", icon: "film-outline" as const },
  { href: "/anuncios/novo", label: "Criar arte para redes", text: "Posts, Stories e ofertas", icon: "image-outline" as const },
  { href: "/anuncios/novo", label: "Gerar narração", text: "Voz profissional com IA", icon: "mic-outline" as const },
  { href: "/mais", label: "Meus projetos", text: "Vídeos, artes e rascunhos", icon: "folder-outline" as const },
] as const;

export default function EstudioScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 12), paddingHorizontal: 16, paddingBottom: 40 }}
    >
      <Text style={{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 14 }}>Estúdio IA</Text>
      <Pressable
        onPress={() => router.push("/anuncios/novo")}
        style={{
          borderRadius: 22,
          padding: 18,
          backgroundColor: colors.primary,
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="play" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: fonts.title, fontWeight: "700" }}>Crie vídeos profissionais com IA</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: fonts.caption, marginTop: 4 }}>Com narração, artes e exportação para redes</Text>
        </View>
      </Pressable>
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
