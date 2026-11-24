import { useRef, useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { welcomeSlides } from "@vendefacil/ui-tokens";

type Props = {
  onIndexChange?: (index: number) => void;
};

export function WelcomeCarousel({ onIndexChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const pageWidth = Dimensions.get("window").width;

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    setIndex(next);
    onIndexChange?.(next);
  }

  function goTo(target: number) {
    scrollRef.current?.scrollTo({ x: target * pageWidth, animated: true });
    setIndex(target);
    onIndexChange?.(target);
  }

  return (
    <View style={{ marginTop: 28 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        style={{ marginHorizontal: -24 }}
      >
        {welcomeSlides.map((slide) => (
          <View key={slide.key} style={{ width: pageWidth, paddingHorizontal: 24 }}>
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.06)",
                padding: 20,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#6D4AFF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={slide.ionIcon} size={26} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#C4B5FD", fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>{slide.eyebrow}</Text>
                  <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginTop: 4, lineHeight: 22 }}>{slide.title}</Text>
                </View>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 19, marginTop: 14, fontWeight: "500" }}>{slide.description}</Text>
              <View style={{ marginTop: 14, gap: 10 }}>
                {slide.bullets.map((bullet) => (
                  <View key={bullet} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <Ionicons name="sparkles" size={14} color="#A78BFA" style={{ marginTop: 2 }} />
                    <Text style={{ flex: 1, color: "rgba(255,255,255,0.9)", fontSize: 12, lineHeight: 16, fontWeight: "500" }}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Text style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: "500", marginTop: 14 }}>Deslize para o lado</Text>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 12 }}>
        {welcomeSlides.map((slide, i) => (
          <Pressable key={slide.key} onPress={() => goTo(i)} accessibilityRole="button" accessibilityState={{ selected: i === index }} accessibilityLabel={slide.title}>
            <View
              style={{
                height: 8,
                width: i === index ? 24 : 8,
                borderRadius: 999,
                backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.3)",
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}