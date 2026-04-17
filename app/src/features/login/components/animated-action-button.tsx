import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ActionButtonVariant = "primary" | "secondary";

type AnimatedActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ActionButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
}: AnimatedActionButtonProps) {
  const pressScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressScale.value, { duration: 120 }) }],
    opacity: withTiming(disabled ? 0.72 : 1, { duration: 120 }),
  }));

  const spinnerColor = variant === "primary" ? "#FFFFFF" : "#2C7BE5";

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) {
          pressScale.value = 0.97;
        }
      }}
      onPressOut={() => {
        pressScale.value = 1;
      }}
      style={[
        styles.button,
        variant === "primary" ? styles.primaryButton : styles.secondaryButton,
        style,
        animatedStyle,
      ]}
      android_ripple={{
        color:
          variant === "primary"
            ? "rgba(255, 255, 255, 0.28)"
            : "rgba(44, 123, 229, 0.16)",
      }}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
      <Text
        style={[
          styles.label,
          variant === "primary" ? styles.primaryLabel : styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    overflow: "hidden",
  },
  primaryButton: {
    backgroundColor: "#2C7BE5",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#B7C6D7",
    backgroundColor: "#F9FBFE",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryLabel: {
    color: "#FFFFFF",
  },
  secondaryLabel: {
    color: "#35506B",
  },
});
