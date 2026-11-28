import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@vendefacil/ui-tokens";
import { api } from "../../src/api";
import { handleTenantError } from "../../src/session";

export default function TabsLayout() {
  useEffect(() => {
    api
      .me()
      .then(({ user }) => {
        if (!user.organizationId || !user.role) router.replace("/onboarding");
      })
      .catch((cause) => {
        handleTenantError(cause);
      });
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: fonts.tiny, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: "Início", tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={20} color={color} /> }} />
      <Tabs.Screen name="produtos" options={{ title: "Anúncios", tabBarIcon: ({ color }) => <Ionicons name="sparkles-outline" size={20} color={color} /> }} />
      <Tabs.Screen name="criar" options={{ href: null }} />
      <Tabs.Screen name="estudio" options={{ title: "Estúdio", tabBarIcon: ({ color }) => <Ionicons name="play-circle-outline" size={20} color={color} /> }} />
      <Tabs.Screen name="mais" options={{ title: "Mais", tabBarIcon: ({ color }) => <Ionicons name="menu-outline" size={20} color={color} /> }} />
    </Tabs>
  );
}
