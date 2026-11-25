import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatHashtag, normalizeHashtags } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

export function HashtagField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const next = normalizeHashtags([...value, raw]);
    onChange(next);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item.toLowerCase() !== tag.toLowerCase()));
  }

  return (
    <View
      style={{
        borderRadius: control.radiusInput,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: control.paddingH,
        paddingVertical: 10,
        gap: 8,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>Hashtags</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {value.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => removeTag(tag)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              borderRadius: control.radiusButton,
              backgroundColor: colors.primarySoft,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: colors.primary, fontSize: fonts.body2, fontWeight: "700" }}>{formatHashtag(tag)}</Text>
            <Ionicons name="close" size={12} color={colors.primary} />
          </Pressable>
        ))}
        {!value.length ? <Text style={{ color: colors.textSecondary, fontSize: fonts.body }}>Nenhuma ainda. Digite e toque em +</Text> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="#produto"
          placeholderTextColor="#9A96AB"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => {
            if (draft.trim()) addTag(draft);
          }}
          style={{ flex: 1, color: colors.text, fontSize: control.fontSize, fontWeight: "600", minHeight: 28, padding: 0 }}
        />
        <Pressable
          onPress={() => {
            if (draft.trim()) addTag(draft);
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: control.radiusButton,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
