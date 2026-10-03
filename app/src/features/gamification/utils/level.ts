import type { Nivel } from "../types";

export const progressRatio = (xpNoNivel: number, xpParaProximo: number): number => {
  const total = xpNoNivel + xpParaProximo;

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(xpNoNivel / total, 1));
};

export const nivelRatio = (nivel: Nivel | null): number =>
  nivel ? progressRatio(nivel.xpNoNivel, nivel.xpParaProximo) : 0;

/** XP e monotonico: um nivel "a frente" nunca deve ser substituido por um atrasado. */
export const isNivelAtOrAhead = (candidate: Nivel, current: Nivel | null): boolean => {
  if (!current) {
    return true;
  }

  if (candidate.atual !== current.atual) {
    return candidate.atual > current.atual;
  }

  return candidate.xpNoNivel >= current.xpNoNivel;
};
