import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@vendefacil/ui-tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 58 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: fonts.tiny, fontWeight: "600", marginBottom: 4 },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: "Início", tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={20} color={color} /> }} />
      <Tabs.Screen name="produtos" options={{ title: "Produtos", tabBarIcon: ({ color }) => <Ionicons name="cube-outline" size={20} color={color} /> }} />
      <Tabs.Screen
        name="criar"
        options={{
          title: "",
          tabBarIcon: () => (
            <Ionicons name="add" size={26} color="#fff" style={{ backgroundColor: colors.primary, borderRadius: 999, overflow: "hidden", padding: 6 }} />
          ),
        }}
      />
      <Tabs.Screen name="estudio" options={{ title: "Estúdio", tabBarIcon: ({ color }) => <Ionicons name="sparkles-outline" size={20} color={color} /> }} />
      <Tabs.Screen name="mais" options={{ title: "Mais", tabBarIcon: ({ color }) => <Ionicons name="menu-outline" size={20} color={color} /> }} />
      <Tabs.Screen name="pedidos" options={{ href: null }} />
      <Tabs.Screen name="estatisticas" options={{ href: null }} />
    </Tabs>
  );
}
