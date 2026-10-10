import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { shineGradient, xpGradient, type GradientColors } from "../theme";

type AnimatedXpBarProps = {
  /** Proporcao do nivel atual, 0 a 1. */
  ratio: number;
  /** De onde a barra parte ao montar. */
  fromRatio?: number;
  /** Nivel atual: quando aumenta, a barra enche ate o fim, pisca e recomeca. */
  levelKey?: number;
  /** Nivel de partida ao montar, para animar uma subida de nivel ja na primeira exibicao. */
  fromLevelKey?: number;
  height?: number;
  colors?: GradientColors;
  trackColor?: string;
  delay?: number;
};

const SHIMMER_WIDTH = 56;
const FILL_SPRING = { damping: 16, stiffness: 90 };

// Worklet: tambem e chamada dentro de `useAnimatedStyle`, na thread de UI.
const clampRatio = (value: number) => {
  "worklet";
  return Math.max(0, Math.min(value, 1));
};

export function AnimatedXpBar({
  ratio,
  fromRatio,
  levelKey,
  fromLevelKey,
  height = 12,
  colors = xpGradient,
  trackColor = "#DFEAF5",
  delay = 0,
}: AnimatedXpBarProps) {
  const fill = useSharedValue(clampRatio(fromRatio ?? 0));
  const glow = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const previousLevelRef = useRef(fromLevelKey ?? levelKey);

  useEffect(() => {
    const target = clampRatio(ratio);
    const previousLevel = previousLevelRef.current;
    previousLevelRef.current = levelKey;

    if (levelKey !== undefined && previousLevel !== undefined && levelKey > previousLevel) {
      fill.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
          withSpring(target, FILL_SPRING)
        )
      );
      glow.value = withDelay(
        delay,
        withSequence(
          withTiming(0, { duration: 480 }),
          withTiming(1, { duration: 140 }),
          withTiming(0, { duration: 700 })
        )
      );
      return;
    }

    fill.value = withDelay(delay, withSpring(target, FILL_SPRING));
  }, [delay, fill, glow, levelKey, ratio]);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      false
    );

    return () => {
      cancelAnimation(shimmer);
    };
  }, [shimmer]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${clampRatio(fill.value) * 100}%` as `${number}%`,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: -SHIMMER_WIDTH + (trackWidth.value + SHIMMER_WIDTH * 2) * shimmer.value,
      },
    ],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + glow.value * 0.35 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <Animated.View
      onLayout={(event) => {
        trackWidth.value = event.nativeEvent.layout.width;
      }}
      style={[
        styles.track,
        { height, borderRadius: height, backgroundColor: trackColor },
        trackStyle,
      ]}
    >
      <Animated.View style={[styles.fill, { borderRadius: height }, fillStyle]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={shineGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.glow, { borderRadius: height }, glowStyle]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SHIMMER_WIDTH,
  },
  glow: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
});
