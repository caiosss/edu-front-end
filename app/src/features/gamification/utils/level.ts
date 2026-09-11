import type { Nivel } from "../types";

/**
 * Espelho de `NivelCalculator.PASSO` (mission-service e auth-service): limiar(n) = 500·n·(n-1)/2.
 * O app nunca calcula o nivel a partir disto — o nivel sempre vem do backend. Serve apenas
 * para animar a barra atravessando um nivel inteiro na subida de nivel.
 */
const PASSO = 500;

/** XP necessario para atravessar o nivel `n` inteiro: limiar(n+1) - limiar(n). */
export const tamanhoDoNivel = (nivel: number): number => PASSO * Math.max(1, nivel);

export const progressRatio = (xpNoNivel: number, xpParaProximo: number): number => {
  const total = xpNoNivel + xpParaProximo;

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(xpNoNivel / total, 1));
};

export const nivelRatio = (nivel: Nivel | null): number =>
  nivel ? progressRatio(nivel.xpNoNivel, nivel.xpParaProximo) : 0;

/**
 * Perfil da API anterior a SPEC-002 (auth-service no commit 5dca298): `xpAtual` e o residuo
 * do nivel corrente, e subir do nivel `n` custa `n * 1000`, subtraido na subida.
 */
const CUSTO_LEGADO_POR_NIVEL = 1000;

export const nivelFromLegacyProfile = (
  nivel: number,
  xpAtual: number
): { nivel: Nivel; xpTotal: number } => {
  const atual = Math.max(1, Math.floor(nivel));
  const xpNoNivel = Math.max(0, xpAtual);
  let xpDosNiveisAnteriores = 0;

  for (let anterior = 1; anterior < atual; anterior++) {
    xpDosNiveisAnteriores += anterior * CUSTO_LEGADO_POR_NIVEL;
  }

  return {
    nivel: {
      atual,
      xpNoNivel,
      xpParaProximo: Math.max(0, atual * CUSTO_LEGADO_POR_NIVEL - xpNoNivel),
    },
    xpTotal: xpDosNiveisAnteriores + xpNoNivel,
  };
};

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
