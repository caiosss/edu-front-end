import { Text, type TextProps } from "react-native";
import {
  colors,
  MAX_FONT_SCALE,
  typography,
  type ColorToken,
  type TypographyVariant,
} from "../../theme";

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: "left" | "center" | "right";
};

/** Texto padrao do app: ja vem com a escala, a cor e o limite de aumento de fonte do tema. */
export function AppText({
  variant = "body",
  color = "text",
  align,
  style,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        typography[variant],
        { color: colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
