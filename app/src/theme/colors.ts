/**
 * Paleta do EduCare, derivada da logo (azul do coracao, marinho do nome e ciano).
 * Todo texto fica em 7:1 ou mais sobre `background`/`surface` (WCAG AAA), pensando em
 * leitores idosos. Estados sempre aparecem com icone e texto, nunca so pela cor.
 */
export const colors = {
  /** Azul da logo. So para logo e ilustracoes: em texto fica abaixo de 7:1. */
  brand: "#1256AD",
  /** Ciano da logo. Decorativo apenas, nunca em texto ou como unico sinal de estado. */
  brandLight: "#59C6E4",

  primary: "#1155AA",
  primaryPressed: "#0C3F80",
  primarySoft: "#E6EFFA",
  onPrimary: "#FFFFFF",

  background: "#F4F7FB",
  surface: "#FFFFFF",
  /** Marinho do nome "EduCare" na logo. */
  text: "#123662",
  textSecondary: "#3E5468",
  /** Contorno de campos e caixas: 3:1, o minimo para componentes de interface. */
  border: "#7A8DA3",
  /** Separador decorativo, sem funcao de contraste. */
  divider: "#DCE4ED",

  success: "#17663A",
  successPressed: "#0F4D2B",
  successSoft: "#E7F5EC",
  danger: "#B42318",
  dangerPressed: "#8F1C13",
  dangerSoft: "#FDEDEB",
  warning: "#7A4A00",
  warningSoft: "#FFF4D9",

  disabled: "#E3E8EE",
  onDisabled: "#3E5468",
} as const;

export type ColorToken = keyof typeof colors;
