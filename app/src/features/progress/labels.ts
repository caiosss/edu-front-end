import type { ProgressoConquista } from "../gamification/types";

/** `ExtratoLinha.origemTipo` -> o comportamento reconhecido, na linguagem do paciente. */
const COMPORTAMENTO_POR_ORIGEM: Record<string, string> = {
  PRESCRICAO: "Registro de uma dose da sua prescrição",
  MISSAO: "Conclusão de uma missão do seu plano de cuidado",
  PERIODO: "Fechamento do seu dia de registros",
  JOGO: "Rodada de treino sobre a sua prescrição e o seu plano de cuidado",
  META: "Cuidado com o seu bem-estar, numa meta liberada pela sua equipe",
  MIGRACAO: "XP acumulado antes da atualização do aplicativo",
};

export const describeRewardOrigin = (origemTipo: string): string =>
  COMPORTAMENTO_POR_ORIGEM[origemTipo] ?? "Atividade registrada no aplicativo";

/**
 * `ExtratoLinha.regraCodigo` -> nome da regra para o paciente. Os codigos sao os do catalogo do
 * gamification-service (RewardRulesSeeder); codigo novo cai em `humanizeCode`, nunca cru.
 */
const NOME_DA_REGRA: Record<string, string> = {
  DOSE_NA_JANELA: "Dose registrada no horário",
  DOSE_REGISTRADA: "Dose registrada",
  MISSAO_CONCLUIDA: "Missão do plano concluída",
  DIA_COMPLETO: "Todas as doses do dia registradas",
  JOGO_MULTIPLA_ESCOLHA_CONCLUIDO: "Rodada de “Perguntas rápidas” concluída",
  JOGO_ASSOCIACAO_CONCLUIDO: "Rodada de “Ligue os pares” concluída",
  JOGO_MEU_DIA_CONCLUIDO: "Rodada de “Meu dia” concluída",
  JOGO_ARRUME_A_MALA_CONCLUIDO: "Rodada de “Arrume a mala” concluída",
  META_OPCIONAL_CUMPRIDA: "Meta de bem-estar cumprida",
  META_SEMANA_CONSISTENTE: "Meta de bem-estar mantida na semana",
  MIGRACAO_LEGADO: "XP de antes da atualização do aplicativo",
};

/** "ALGO_NOVO" -> "Algo novo": ultimo recurso para um codigo que o app ainda nao conhece. */
export const humanizeCode = (codigo: string): string => {
  const texto = codigo.trim().replace(/_+/g, " ").toLowerCase();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
};

export const describeRewardRule = (regraCodigo: string | null | undefined): string => {
  if (!regraCodigo) {
    return "Regra do catálogo de recompensas";
  }
  return NOME_DA_REGRA[regraCodigo] ?? humanizeCode(regraCodigo);
};

/** "4 de 7 dias", "12 de 50 registros", "340 de 1000 XP". */
export const formatAchievementProgress = ({ atual, alvo, unidade }: ProgressoConquista): string =>
  `${Math.min(atual, alvo)} de ${alvo}${unidade ? ` ${unidade}` : ""}`;

export const achievementProgressRatio = (progresso: ProgressoConquista | null): number =>
  progresso && progresso.alvo > 0
    ? Math.max(0, Math.min(progresso.atual / progresso.alvo, 1))
    : 0;

export const pluralize = (quantidade: number, singular: string, plural: string): string =>
  `${quantidade} ${quantidade === 1 ? singular : plural}`;
