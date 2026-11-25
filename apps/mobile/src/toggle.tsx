import { Pressable, View } from "react-native";
import { colors } from "@vendefacil/ui-tokens";

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 999,
        backgroundColor: value ? colors.primary : "#E0E3EA",
        padding: 2,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          backgroundColor: "#fff",
          alignSelf: value ? "flex-end" : "flex-start",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
}
