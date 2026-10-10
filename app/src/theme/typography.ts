import type { TextStyle } from "react-native";

/**
 * Escala de texto para leitores idosos: corpo em 18 e nada abaixo de 16.
 * As alturas de linha ficam em ~1,4x para separar bem as linhas.
 */
export const typography = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: "700" },
  title: { fontSize: 24, lineHeight: 32, fontWeight: "700" },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
  body: { fontSize: 18, lineHeight: 26, fontWeight: "400" },
  bodyStrong: { fontSize: 18, lineHeight: 26, fontWeight: "600" },
  small: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  smallStrong: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  button: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/**
 * Respeita a fonte escolhida no sistema, mas limita o aumento para o layout nao quebrar.
 * Com corpo em 18, o maximo chega a ~29.
 */
export const MAX_FONT_SCALE = 1.6;
