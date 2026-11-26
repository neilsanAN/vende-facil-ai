import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

/** Título de tela — Invento heading. */
export function ScreenTitle({ children, style }: { children: string; style?: ViewStyle }) {
  return <Text style={[{ color: colors.text, fontSize: fonts.heading, fontWeight: "700", marginBottom: 14 }, style]}>{children}</Text>;
}

/** Label de seção acima de chips/inputs. */
export function SectionLabel({ children }: { children: string }) {
  return <Text style={{ color: colors.text, fontSize: fonts.body, fontWeight: "700", marginBottom: 8 }}>{children}</Text>;
}

/** Campo com label discreto (padrão Invento). */
export function Field({
  label,
  value,
  onChangeText,
  multiline,
  placeholder,
  keyboardType,
  editable = true,
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  editable?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
}) {
  return (
    <View
      style={{
        borderRadius: control.radiusInput,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: control.paddingH,
        paddingVertical: multiline ? 10 : 8,
        minHeight: multiline ? undefined : control.height,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600", marginBottom: 2 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#9A96AB"
        keyboardType={keyboardType}
        editable={editable}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        textAlignVertical={multiline ? "top" : "center"}
        scrollEnabled={multiline}
        style={{
          color: colors.text,
          fontSize: control.fontSize,
          fontWeight: "600",
          padding: 0,
          minHeight: multiline ? 88 : 22,
        }}
      />
    </View>
  );
}

/** Select/pressable no formato de input h40. */
export function SelectRow({
  label,
  value,
  onPress,
}: {
  label?: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: control.height,
        borderRadius: control.radiusInput,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: control.paddingH,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        {label ? <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600", marginBottom: 2 }}>{label}</Text> : null}
        <Text style={{ color: colors.text, fontSize: control.fontSize, fontWeight: "600" }} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={control.icon} color={colors.textSecondary} />
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: control.radiusButton,
        paddingHorizontal: 14,
        paddingVertical: control.paddingV,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: active ? "#fff" : colors.text, fontSize: fonts.body, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={busy || disabled}
      onPress={onPress}
      style={{
        height: control.buttonHeight,
        borderRadius: control.radiusButton,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: busy || disabled ? 0.7 : 1,
      }}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: control.buttonFontSize, fontWeight: "700" }}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        height: control.buttonHeight,
        borderRadius: control.radiusButton,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Text style={{ color: colors.text, fontSize: control.buttonFontSize, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function HelperText({ children, error }: { children: string; error?: boolean }) {
  return <Text style={{ color: error ? colors.error : colors.textSecondary, fontSize: fonts.body, marginBottom: 10 }}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          borderRadius: control.radiusSheet,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
