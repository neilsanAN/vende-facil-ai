import { Modal, Pressable, Text, View } from "react-native";
import { colors, control, fonts } from "@vendefacil/ui-tokens";
import { SheetHandle } from "./feedback";

export type ActionMenuItem = {
  key: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

/** Menu profissional estilo 3 pontinhos (bottom sheet). */
export function ActionMenu({
  open,
  title,
  items,
  onClose,
}: {
  open: boolean;
  title?: string;
  items: ActionMenuItem[];
  onClose: () => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.45)", justifyContent: "flex-end" }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            marginHorizontal: 12,
            marginBottom: 24,
            borderRadius: 20,
            backgroundColor: colors.surface,
            overflow: "hidden",
            shadowColor: "#171827",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <SheetHandle />
          {title ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fonts.body,
                fontWeight: "600",
                textAlign: "center",
                paddingHorizontal: 20,
                paddingBottom: 12,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
          {items.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => {
                item.onPress();
                onClose();
              }}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 18,
                borderTopWidth: index === 0 && !title ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ color: item.destructive ? colors.error : colors.text, fontSize: fonts.title, fontWeight: "600", textAlign: "center" }}>{item.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={{ paddingVertical: 16, borderTopWidth: 8, borderTopColor: "#F3F4F8" }}>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "600", textAlign: "center" }}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
