import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@vendefacil/ui-tokens";

type Props = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Se false, só envolve KeyboardAvoidingView (quando já há ScrollView interno). */
  scroll?: boolean;
  bottomExtra?: number;
};

/** Envolve formulários para o teclado não cobrir os inputs. */
export function KeyboardScreen({ children, contentContainerStyle, style, scroll = true, bottomExtra = 24 }: Props) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const bottomPad = Math.max(insets.bottom, 28) + bottomExtra + (Platform.OS === "android" ? keyboardHeight : 0);

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: 16,
          paddingBottom: bottomPad,
          flexGrow: 1,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingBottom: Platform.OS === "android" ? keyboardHeight : 0 }, contentContainerStyle]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      {body}
    </KeyboardAvoidingView>
  );
}

/** Hook para telas com layout próprio (ex.: steps animados). */
export function useKeyboardBottomInset() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return Platform.OS === "android" ? keyboardHeight : 0;
}
