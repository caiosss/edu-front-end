import { useEffect, useId, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  size: number;
  strokeWidth: number;
  /** 0 a 1 */
  ratio: number;
  colors?: readonly [string, string];
  trackColor?: string;
  delay?: number;
  children?: ReactNode;
};

const DEFAULT_COLORS = ["#4DABF7", "#2C7BE5"] as const;

export function ProgressRing({
  size,
  strokeWidth,
  ratio,
  colors = DEFAULT_COLORS,
  trackColor = "#DFEAF5",
  delay = 0,
  children,
}: ProgressRingProps) {
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSpring(Math.max(0, Math.min(ratio, 1)), { damping: 18, stiffness: 80 })
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [delay, progress, ratio]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - Math.max(0, Math.min(progress.value, 1))),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          fill="none"
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    transform: [{ rotate: "-90deg" }],
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
