import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radius, spacing, type ColorToken } from "../../theme";

export type CardTone = "default" | "primary" | "success" | "warning" | "danger";

const TONE_BORDER: Record<Exclude<CardTone, "default">, ColorToken> = {
  primary: "primary",
  success: "success",
  warning: "warning",
  danger: "danger",
};

type CardProps = ViewProps & {
  /** Contorno de 2dp na cor do estado, para chamar atencao sem depender so do fundo. */
  tone?: CardTone;
};

/** Superficie branca com borda leve. Sem sombra: contorno separa melhor para quem enxerga pouco. */
export function Card({ tone = "default", style, ...props }: CardProps) {
  return (
    <View
      {...props}
      style={[
        styles.card,
        tone !== "default"
          ? { borderWidth: 2, borderColor: colors[TONE_BORDER[tone]] }
          : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
