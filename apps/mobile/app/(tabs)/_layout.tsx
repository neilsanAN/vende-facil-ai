import { useEffect } from "react";
import { Pressable, View } from "react-native";
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
      <Tabs.Screen name="produtos" options={{ title: "Produtos", tabBarIcon: ({ color }) => <Ionicons name="cube-outline" size={20} color={color} /> }} />
      <Tabs.Screen
        name="criar"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <Pressable
              onPress={props.onPress}
              accessibilityRole={props.accessibilityRole}
              accessibilityState={props.accessibilityState}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  shadowColor: "#5B3DF0",
                  shadowOpacity: 0.28,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 6,
                }}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="estudio" options={{ title: "Estúdio", tabBarIcon: ({ color }) => <Ionicons name="play-circle-outline" size={20} color={color} /> }} />
      <Tabs.Screen name="mais" options={{ title: "Mais", tabBarIcon: ({ color }) => <Ionicons name="menu-outline" size={20} color={color} /> }} />
      <Tabs.Screen name="pedidos" options={{ href: null }} />
      <Tabs.Screen name="estatisticas" options={{ href: null }} />
    </Tabs>
  );
}
