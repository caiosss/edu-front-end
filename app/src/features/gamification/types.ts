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
  /** Nulo na API anterior a SPEC-002, que respondia apenas "Parabéns! Você ganhou N XP!". */
  nivel: Nivel | null;
};

/** `ConquistaResponseDTO` */
export type Conquista = {
  id: string;
  titulo: string;
  descricao: string;
  requisitoXp: number;
  icone: string;
};

/** `ConquistaPacienteResponseDTO` */
export type ConquistaPaciente = {
  id: string;
  pacienteId: string;
  conquista: Conquista;
  dataConquista: string | null;
};

export type CelebrationEvent =
  | {
      id: string;
      kind: "reward";
      conclusao: ConclusaoResponse;
      nivelAnterior: Nivel | null;
      /**
       * Nivel reconciliado para exibicao. `conclusao.nivel` vem do ledger do mission-service,
       * que nao contem o XP legado migrado no auth-service; o mais adiantado dos dois vence.
       * Nulo enquanto nenhum nivel for conhecido.
       */
      nivelAtual: Nivel | null;
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
      dataConquista: string | null;
    };
