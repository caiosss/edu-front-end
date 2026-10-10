import type { ProgressoConquista } from "../gamification/types";

/** `ExtratoLinha.origemTipo` -> o comportamento reconhecido, na linguagem do paciente. */
const COMPORTAMENTO_POR_ORIGEM: Record<string, string> = {
  PRESCRICAO: "Registro de uma dose da sua prescrição",
  MISSAO: "Conclusão de uma missão do seu plano de cuidado",
  PERIODO: "Fechamento do seu dia de registros",
  JOGO: "Rodada de treino sobre a sua prescrição e o seu plano de cuidado",
  MIGRACAO: "XP acumulado antes da atualização do aplicativo",
};

export const describeRewardOrigin = (origemTipo: string): string =>
  COMPORTAMENTO_POR_ORIGEM[origemTipo] ?? "Atividade registrada no aplicativo";

/** "4 de 7 dias", "12 de 50 registros", "340 de 1000 XP". */
export const formatAchievementProgress = ({ atual, alvo, unidade }: ProgressoConquista): string =>
  `${Math.min(atual, alvo)} de ${alvo}${unidade ? ` ${unidade}` : ""}`;

export const achievementProgressRatio = (progresso: ProgressoConquista | null): number =>
  progresso && progresso.alvo > 0
    ? Math.max(0, Math.min(progresso.atual / progresso.alvo, 1))
    : 0;

export const pluralize = (quantidade: number, singular: string, plural: string): string =>
  `${quantidade} ${quantidade === 1 ? singular : plural}`;
