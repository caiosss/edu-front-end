import { useEffect, useRef, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type AnimatedCounterProps = {
  value: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  onComplete?: () => void;
};

export function AnimatedCounter({
  value,
  duration = 900,
  delay = 0,
  prefix = "",
  suffix = "",
  style,
  onComplete,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const pop = useSharedValue(1);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    let frameId: number | null = null;

    const timeoutId = setTimeout(() => {
      const startedAt = Date.now();

      const tick = () => {
        const progress = Math.min((Date.now() - startedAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(value * eased));

        if (progress < 1) {
          frameId = requestAnimationFrame(tick);
          return;
        }

        pop.value = withSequence(
          withTiming(1.28, { duration: 130, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 6, stiffness: 180 })
        );
        onCompleteRef.current?.();
      };

      frameId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeoutId);

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [delay, duration, pop, value]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View style={[{ alignSelf: "flex-start" }, popStyle]}>
      <Text style={style}>
        {prefix}
        {displayValue}
        {suffix}
      </Text>
    </Animated.View>
  );
}
