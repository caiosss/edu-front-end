import { Image, type ImageStyle, type StyleProp } from "react-native";

const SOURCES = {
  full: require("../../../../assets/brand/logo.png"),
  symbol: require("../../../../assets/brand/logo-symbol.png"),
} as const;

/** Proporcao largura/altura de cada arte, para calcular a altura a partir da largura. */
const ASPECT_RATIO = {
  full: 349 / 255,
  symbol: 243 / 171,
} as const;

type LogoProps = {
  /** `full` tem o nome "EduCare"; `symbol` e so o livro com o coracao. */
  variant?: keyof typeof SOURCES;
  width?: number;
  style?: StyleProp<ImageStyle>;
};

export function Logo({ variant = "full", width = 180, style }: LogoProps) {
  return (
    <Image
      source={SOURCES[variant]}
      accessibilityRole="image"
      accessibilityLabel="EduCare"
      resizeMode="contain"
      style={[{ width, height: width / ASPECT_RATIO[variant] }, style]}
    />
  );
}
