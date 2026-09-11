import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type SparkleProps = {
  /** Centro da faisca, relativo ao container pai. */
  x: number;
  y: number;
  size?: number;
  delay?: number;
  duration?: number;
  color?: string;
};

export function Sparkle({
  x,
  y,
  size = 14,
  delay = 0,
  duration = 1400,
  color = "#FFE8A3",
}: SparkleProps) {
  const twinkle = useSharedValue(0);

  useEffect(() => {
    twinkle.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.45, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: duration * 0.55, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(twinkle);
    };
  }, [delay, duration, twinkle]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value,
    transform: [{ scale: 0.3 + twinkle.value * 0.9 }, { rotate: `${twinkle.value * 90}deg` }],
  }));

  const armThickness = Math.max(2, size * 0.2);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { left: x - size / 2, top: y - size / 2, width: size, height: size },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.arm,
          { width: armThickness, height: size, borderRadius: size, backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.arm,
          { width: size, height: armThickness, borderRadius: size, backgroundColor: color },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  arm: {
    position: "absolute",
  },
});
