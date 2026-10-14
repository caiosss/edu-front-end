export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/**
 * Largura maxima do conteudo. Em tablet e celular dobravel as telas ficam centralizadas em vez
 * de esticar cartoes e botoes ate as bordas, o que dificulta a leitura.
 */
export const layout = {
  maxContentWidth: 640,
  maxDialogWidth: 480,
} as const;

/** Areas de toque acima dos 48dp do Material, pensando em tremor e pouca precisao no toque. */
export const touch = {
  min: 56,
  button: 60,
  icon: 24,
} as const;
