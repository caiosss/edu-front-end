import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, radius, spacing, touch, type ColorToken } from "../../theme";
import { AppText } from "./app-text";

export type BigButtonVariant = "primary" | "secondary" | "success" | "danger";

type VariantStyle = {
  background: ColorToken;
  pressed: ColorToken;
  content: ColorToken;
  border?: ColorToken;
};

const VARIANTS: Record<BigButtonVariant, VariantStyle> = {
  primary: { background: "primary", pressed: "primaryPressed", content: "onPrimary" },
  secondary: {
    background: "surface",
    pressed: "primarySoft",
    content: "primary",
    border: "primary",
  },
  success: { background: "success", pressed: "successPressed", content: "onPrimary" },
  danger: { background: "danger", pressed: "dangerPressed", content: "onPrimary" },
};

type BigButtonProps = {
  label: string;
  onPress: () => void;
  variant?: BigButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botao principal do app: 60dp de altura, texto sempre visivel e icone opcional.
 * Use no maximo um `primary` por tela; as demais acoes ficam em `secondary`.
 */
export function BigButton({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
}: BigButtonProps) {
  const palette = VARIANTS[variant];
  const isInactive = disabled || loading;
  const contentColor: ColorToken = disabled ? "onDisabled" : palette.content;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors[
            disabled ? "disabled" : pressed ? palette.pressed : palette.background
          ],
          borderColor: palette.border && !disabled ? colors[palette.border] : "transparent",
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors[contentColor]} />
        ) : Icon ? (
          <Icon size={touch.icon} color={colors[contentColor]} />
        ) : null}
        <AppText variant="button" color={contentColor} align="center">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch.button,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
});
