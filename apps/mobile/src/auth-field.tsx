import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Campo de auth/onboarding: label + * + input compacto separado. */
export function AuthField({
  label,
  required,
  icon,
  error,
  trailing,
  multiline,
  children,
}: {
  label: string;
  required?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  trailing?: ReactNode;
  multiline?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "600", marginBottom: 6 }}>
        {label}
        {required ? <Text style={{ color: "#FFB4BE" }}> *</Text> : null}
      </Text>
      <View
        style={{
          minHeight: multiline ? 88 : 40,
          borderRadius: 10,
          backgroundColor: "#fff",
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 8,
          borderWidth: error ? 2 : 0,
          borderColor: error ? "#FF6B7A" : "transparent",
        }}
      >
        <Ionicons name={icon} size={16} color="#9A96AB" style={multiline ? { marginTop: 2 } : undefined} />
        <View style={{ flex: 1 }}>{children}</View>
        {trailing}
      </View>
      {error ? <Text style={{ color: "#FFE0E4", fontSize: 11, fontWeight: "500", marginTop: 6 }}>{error}</Text> : null}
    </View>
  );
}
