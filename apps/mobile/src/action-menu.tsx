import { Modal, Pressable, Text, View } from "react-native";
import { colors, fonts } from "@vendefacil/ui-tokens";

export type ActionMenuItem = {
  key: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

/** Menu profissional estilo 3 pontinhos. */
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
            borderRadius: 18,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          {title ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "600", textAlign: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              {title}
            </Text>
          ) : null}
          {items.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 18,
                borderTopWidth: index === 0 && !title ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ color: item.destructive ? colors.error : colors.text, fontSize: 15, fontWeight: "600", textAlign: "center" }}>{item.label}</Text>
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
