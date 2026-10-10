/** `ConclusaoResponseDTO.RegistroDTO.ProgressoDoDiaDTO` */
export type ProgressoDoDia = {
  registradas: number;
  previstas: number;
};

/** O que aconteceu, em termos clinicos. Vem antes da recompensa na resposta e na tela. */
export type Registro = {
  tipo: "MISSAO" | "DOSE";
  horarioPrevisto: string | null;
  horarioRegistrado: string | null;
  dentroDaJanela: boolean | null;
  progressoDoDia: ProgressoDoDia | null;
};

export type RegraAplicada = {
  codigo: string;
  versao: number | null;
};

/**
 * `limiteAtingido`: a acao foi registrada, mas o XP maximo do dia ja havia sido dado.
 * Nunca apresentar como falha ou perda.
 */
export type Recompensa = {
  xp: number;
  regras: RegraAplicada[];
  motivo: string | null;
  limiteAtingido: boolean;
};

/** Nivel derivado do XP total. */
export type Nivel = {
  atual: number;
  xpNoNivel: number;
  xpParaProximo: number;
};

/** Resposta de `POST /missoes/concluir`. */
export type ConclusaoResponse = {
  registro: Registro | null;
  recompensa: Recompensa;
  nivel: Nivel;
};

/** `StreakResponse`: sequencia de dias com adesao completa. Quebra nunca e anunciada. */
export type Streak = {
  atual: number;
  recorde: number;
};

/** `GET /gamification/perfil` */
export type GamificationProfile = {
  xpTotal: number;
  nivel: Nivel;
  moedas: number;
  streak: Streak;
};

/** `ProgressoResponse`: progresso parcial de uma conquista, na unidade do criterio. */
export type ProgressoConquista = {
  atual: number;
  alvo: number;
  unidade: string;
};

/** `ConquistaResponse` de `GET /gamification/conquistas`. */
export type Conquista = {
  codigo: string;
  titulo: string;
  descricao: string;
  icone: string | null;
  desbloqueadaEm: string | null;
  /** Nulo quando ja desbloqueada ou quando o criterio nao e mensuravel (taxa do periodo). */
  progresso: ProgressoConquista | null;
};

/** `ExtratoLinha`: toda recompensa responde por qual comportamento, regra, versao e quando. */
export type ExtratoLinha = {
  quando: string;
  motivo: string;
  xp: number;
  moedas: number;
  regraCodigo: string;
  regraVersao: number;
  origemTipo: string;
};

export type ExtratoPagina = {
  linhas: ExtratoLinha[];
  pagina: number;
  ultimaPagina: boolean;
};

/** O backend devolve estado, nunca cor. */
export type EstadoDia = "COMPLETO" | "PARCIAL" | "SEM_REGISTRO";

export type DiaAdesao = {
  dia: string;
  previstas: number;
  registradas: number;
  estado: EstadoDia;
};

export type ResumoHoje = {
  dosesPrevistas: number;
  dosesRegistradas: number;
  proximoHorario: string | null;
  missoesPrevistas: number;
  missoesConcluidas: number;
};

export type ResumoPeriodo = {
  de: string;
  ate: string;
  dosesPrevistas: number;
  dosesRegistradas: number;
  /** Nula quando nada foi previsto no periodo. */
  taxa: number | null;
  dias: DiaAdesao[];
};

export type PeriodoResumo = "SEMANA" | "MES";

/**
 * `GET /gamification/resumo`: a tela de Progresso inteira, na ordem de leitura da SPEC-007:
 * clinico (`hoje`), tendencia (`periodo`, `streak`) e, por ultimo, o ludico.
 * `hoje` e `periodo` sao nulos quando o mission-service nao respondeu.
 */
export type ResumoProgresso = {
  hoje: ResumoHoje | null;
  periodo: ResumoPeriodo | null;
  streak: Streak;
  nivel: Nivel;
  xpTotal: number;
  conquistasRecentes: Conquista[];
  recompensasRecentes: ExtratoLinha[];
};

export type CelebrationEvent =
  | {
      id: string;
      kind: "reward";
      conclusao: ConclusaoResponse;
      nivelAnterior: Nivel | null;
      /**
       * Nivel reconciliado para exibicao. `conclusao.nivel` sai do ledger do mission-service e
       * `/gamification/perfil` do gamification-service; o mais adiantado dos dois vence.
       */
      nivelAtual: Nivel;
    }
  | {
      id: string;
      kind: "levelUp";
      de: number;
      para: number;
    }
  | {
      id: string;
      kind: "achievement";
      conquista: Conquista;
      /** Outras conquistas destravadas junto: viram uma frase no mesmo modal, nao um modal cada. */
      outras: number;
    };
