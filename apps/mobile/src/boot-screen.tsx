import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors, fonts } from "@vendefacil/ui-tokens";

type Props = {
  /** Ex.: "Verificando sessão…", "Buscando atualização…" */
  message?: string;
  detail?: string;
};

/** Splash de inicialização — marca + status legível (não só spinner no escuro). */
export function BootScreen({
  message = "Preparando o app…",
  detail = "Isso leva só alguns segundos",
}: Props) {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.55)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const barLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bar, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(bar, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    pulseLoop.start();
    barLoop.start();
    return () => {
      pulseLoop.stop();
      barLoop.stop();
    };
  }, [bar, pulse]);

  const barWidth = bar.interpolate({ inputRange: [0, 1], outputRange: ["12%", "92%"] });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#070B18",
        paddingTop: Math.max(insets.top, 24),
        paddingBottom: Math.max(insets.bottom, 28),
        paddingHorizontal: 28,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StatusBar style="light" />
      {/* atmosfera */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: colors.primary,
          opacity: 0.18,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -40,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: "#4C1D95",
          opacity: 0.25,
        }}
      />

      <Animated.View style={{ opacity: pulse, alignItems: "center" }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 22,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.primary,
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <Ionicons name="bag-handle" size={34} color="#fff" />
        </View>
      </Animated.View>

      <Text style={{ marginTop: 20, color: "#fff", fontSize: 24, fontWeight: "700", letterSpacing: -0.3 }}>
        VendeFácil <Text style={{ color: "#C4B5FD" }}>AI</Text>
      </Text>
      <Text style={{ marginTop: 6, color: "rgba(255,255,255,0.62)", fontSize: fonts.body, fontWeight: "500", textAlign: "center" }}>
        Criar, divulgar e vender
      </Text>

      <View style={{ width: "100%", maxWidth: 280, marginTop: 40 }}>
        <View
          style={{
            height: 4,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={{
              height: "100%",
              width: barWidth,
              borderRadius: 999,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        <Text
          style={{
            marginTop: 16,
            color: "#fff",
            fontSize: fonts.subtitle,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {message}
        </Text>
        {detail ? (
          <Text
            style={{
              marginTop: 6,
              color: "rgba(255,255,255,0.55)",
              fontSize: fonts.body2,
              fontWeight: "500",
              textAlign: "center",
              lineHeight: 16,
            }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
