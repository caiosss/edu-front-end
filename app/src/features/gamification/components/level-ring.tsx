import { useEffect, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { Nivel } from "../types";
import { nivelRatio } from "../utils/level";
import { ProgressRing } from "./progress-ring";

type LevelRingProps = {
  nivel: Nivel | null;
  size?: number;
  strokeWidth?: number;
  tone?: "light" | "dark";
  delay?: number;
};

const BLUE_RING = ["#4DABF7", "#845EF7"] as const;
const GOLD_RING = ["#FFE8A3", "#F5B942"] as const;

export function LevelRing({
  nivel,
  size = 64,
  strokeWidth = 7,
  tone = "light",
  delay = 0,
}: LevelRingProps) {
  const glow = useSharedValue(0);
  const pop = useSharedValue(1);
  const previousLevelRef = useRef(nivel?.atual);
  const isDark = tone === "dark";

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(glow);
    };
  }, [glow]);

  useEffect(() => {
    const previousLevel = previousLevelRef.current;
    previousLevelRef.current = nivel?.atual;

    if (previousLevel !== undefined && nivel && nivel.atual > previousLevel) {
      pop.value = withSequence(
        withTiming(1.24, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withSpring(1, { damping: 5, stiffness: 160 })
      );
    }
  }, [nivel, pop]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.14 + glow.value * 0.26,
    transform: [{ scale: 1 + glow.value * 0.12 }],
  }));

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, popStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isDark ? "#FFD43B" : "#4DABF7",
          },
          glowStyle,
        ]}
      />
      <ProgressRing
        size={size}
        strokeWidth={strokeWidth}
        ratio={nivelRatio(nivel)}
        colors={isDark ? GOLD_RING : BLUE_RING}
        trackColor={isDark ? "rgba(255, 255, 255, 0.18)" : "#DFEAF5"}
        delay={delay}
      >
        {size >= 72 ? (
          <Text style={[styles.caption, { color: isDark ? "#FFE8A3" : "#5B738A" }]}>NÍVEL</Text>
        ) : null}
        <Animated.Text
          key={nivel?.atual ?? 0}
          entering={ZoomIn.springify().damping(9)}
          style={[
            styles.value,
            {
              fontSize: Math.round(size * 0.32),
              color: isDark ? "#FFFFFF" : "#12314C",
            },
          ]}
        >
          {nivel?.atual ?? "–"}
        </Animated.Text>
      </ProgressRing>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
  },
  caption: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  value: {
    fontWeight: "800",
  },
});
