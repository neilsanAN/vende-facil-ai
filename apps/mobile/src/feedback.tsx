import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Easing, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, control, fonts } from "@vendefacil/ui-tokens";

type ToastTone = "info" | "success" | "error";

type FeedbackApi = {
  showToast: (message: string, tone?: ToastTone) => void;
  run: <T>(label: string, task: () => Promise<T>) => Promise<T>;
  setBusy: (label: string | null) => void;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback precisa do FeedbackProvider");
  return ctx;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [busy, setBusyLabel] = useState<string | null>(null);
  const toastY = useRef(new Animated.Value(-80)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    if (busy) loop.start();
    else {
      loop.stop();
      spin.setValue(0);
    }
    return () => loop.stop();
  }, [busy, spin]);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ message, tone });
      Animated.spring(toastY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(toastY, { toValue: -80, duration: 220, useNativeDriver: true }).start(() => setToast(null));
      }, 2600);
    },
    [toastY],
  );

  const setBusy = useCallback((label: string | null) => setBusyLabel(label), []);

  const run = useCallback(
    async <T,>(label: string, task: () => Promise<T>) => {
      setBusyLabel(label);
      try {
        const result = await task();
        return result;
      } finally {
        setBusyLabel(null);
      }
    },
    [],
  );

  const api = useMemo(() => ({ showToast, run, setBusy }), [showToast, run, setBusy]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const toneBg = toast?.tone === "success" ? "#ECFDF5" : toast?.tone === "error" ? "#FEF2F2" : colors.primarySoft;
  const toneFg = toast?.tone === "success" ? "#166534" : toast?.tone === "error" ? "#B91C1C" : colors.primary;
  const toneIcon = toast?.tone === "success" ? "checkmark-circle" : toast?.tone === "error" ? "alert-circle" : "information-circle";

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: Math.max(insets.top, 10) + 4,
            left: 16,
            right: 16,
            zIndex: 100,
            transform: [{ translateY: toastY }],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderRadius: 14,
              backgroundColor: toneBg,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 12,
              shadowColor: "#171827",
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Ionicons name={toneIcon} size={18} color={toneFg} />
            <Text style={{ flex: 1, color: colors.text, fontSize: fonts.body, fontWeight: "600" }}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}

      <Modal visible={Boolean(busy)} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(15,12,30,0.42)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              width: "100%",
              maxWidth: 280,
              borderRadius: 20,
              backgroundColor: colors.surface,
              paddingVertical: 28,
              paddingHorizontal: 22,
              alignItems: "center",
              gap: 14,
            }}
          >
            <Animated.View style={{ transform: [{ rotate }] }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  borderWidth: 3,
                  borderColor: colors.primarySoft,
                  borderTopColor: colors.primary,
                }}
              />
            </Animated.View>
            <ActivityIndicator color={colors.primary} style={{ position: "absolute", opacity: 0 }} />
            <Text style={{ color: colors.text, fontSize: fonts.subtitle, fontWeight: "700", textAlign: "center" }}>{busy}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.caption, textAlign: "center" }}>Aguarde um instante…</Text>
          </View>
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  destructive,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
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
            paddingTop: 8,
          }}
        >
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 999, backgroundColor: colors.border }} />
          </View>
          <Text style={{ color: colors.text, fontSize: fonts.title, fontWeight: "700", textAlign: "center", paddingHorizontal: 20 }}>{title}</Text>
          {message ? (
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body, textAlign: "center", paddingHorizontal: 24, marginTop: 8, marginBottom: 4 }}>{message}</Text>
          ) : null}
          <Pressable
            onPress={() => {
              onConfirm();
              onClose();
            }}
            style={{ paddingVertical: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}
          >
            <Text style={{ color: destructive ? colors.error : colors.primary, fontSize: fonts.title, fontWeight: "700", textAlign: "center" }}>{confirmLabel}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ paddingVertical: 16, borderTopWidth: 8, borderTopColor: "#F3F4F8" }}>
            <Text style={{ color: colors.textSecondary, fontSize: fonts.body, fontWeight: "600", textAlign: "center" }}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SheetHandle() {
  return (
    <View style={{ alignItems: "center", paddingVertical: 8 }}>
      <View style={{ width: 36, height: 4, borderRadius: control.radiusButton, backgroundColor: colors.border }} />
    </View>
  );
}
