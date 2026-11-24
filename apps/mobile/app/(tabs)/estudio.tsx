import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { colors, fonts } from "@vendefacil/ui-tokens";

const items = [
  { href: "/anuncios", label: "Criar anúncio", text: "Foto e texto com IA" },
  { href: "/anuncios", label: "Criar vídeo", text: "Cenas e narração" },
  { href: "/mais", label: "Meus projetos", text: "Histórico no app web" },
] as const;

export default function EstudioScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={{ borderRadius: 16, padding: 16, backgroundColor: colors.primary, marginBottom: 16 }}>
        <Text style={{ color: "#fff", fontSize: fonts.title, fontWeight: "700" }}>Estúdio IA</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: fonts.body, marginTop: 6 }}>Crie vídeos e anúncios profissionais.</Text>
      </View>
      {items.map((item) => (
        <Link key={item.label} href={item.href} asChild>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 }}>
            <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>{item.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, marginTop: 4 }}>{item.text}</Text>
          </View>
        </Link>
      ))}
    </ScrollView>
  );
}
