import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@vendefacil/ui-tokens";

const tabs = [
  { name: "inicio", title: "Início", icon: "grid-outline" },
  { name: "produtos", title: "Produtos", icon: "cube-outline" },
  { name: "pedidos", title: "Pedidos", icon: "receipt-outline" },
  { name: "estatisticas", title: "Estatísticas", icon: "bar-chart-outline" },
  { name: "mais", title: "Mais", icon: "menu-outline" },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0C1222", borderTopColor: colors.border, height: 58 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: fonts.tiny, fontWeight: "600", marginBottom: 4 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Ionicons name={tab.icon} size={20} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
