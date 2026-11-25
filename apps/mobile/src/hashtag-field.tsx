import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatHashtag, normalizeHashtags } from "@vendefacil/types";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

function toEditable(tags: string[]) {
  return tags.map((tag) => formatHashtag(tag)).filter(Boolean).join(" ");
}

export function HashtagField({
  value,
  onChange,
  label = "Hashtags",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const [text, setText] = useState(() => toEditable(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(toEditable(value));
  }, [value, focused]);

  function commit(raw: string) {
    const next = normalizeHashtags(raw);
    onChange(next);
    setText(toEditable(next));
  }

  function removeTag(tag: string) {
    const next = value.filter((item) => item.toLowerCase() !== tag.toLowerCase());
    onChange(next);
    setText(toEditable(next));
  }

  return (
    <View
      style={{
        borderRadius: control.radiusInput,
        borderWidth: 1,
        borderColor: focused ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: control.paddingH,
        paddingVertical: 10,
        gap: 8,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, fontWeight: "600" }}>{label}</Text>

      {value.length ? (
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
        </View>
      ) : null}

      <TextInput
        value={text}
        onChangeText={setText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit(text);
        }}
        onSubmitEditing={() => commit(text)}
        placeholder="#produto #oferta #loja"
        placeholderTextColor="#9A96AB"
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        textAlignVertical="top"
        blurOnSubmit
        style={{
          color: colors.text,
          fontSize: control.fontSize,
          fontWeight: "600",
          minHeight: 44,
          padding: 0,
          margin: 0,
        }}
      />
      <Text style={{ color: colors.textSecondary, fontSize: fonts.tiny, fontWeight: "500" }}>
        Edite livremente. Separe com espaço. Toque no chip para remover.
      </Text>
    </View>
  );
}
