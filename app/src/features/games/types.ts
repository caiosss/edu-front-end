/** `Jogo` do education-service (SPEC-012 §3, SPEC-013 §3). */
export type Jogo = "MULTIPLA_ESCOLHA" | "ASSOCIACAO" | "MEU_DIA" | "ARRUME_A_MALA";

/** Sobre o que a pergunta e. Os dois ultimos sao dos jogos de rotina (SPEC-013). */
export type CampoPergunta = "FREQUENCIA" | "HORARIOS" | "HORARIO_DOSE" | "ITEM_MALA";

/** `CategoriaMissao`, copia do contrato do mission-service (SPEC-013 §5.2). */
export type CategoriaMissao =
  | "ATIVIDADE_FISICA"
  | "HIDRATACAO"
  | "ALIMENTACAO"
  | "DESCANSO"
  | "OUTRO";

/** `SituacaoResponse` de `GET /jogos/disponiveis`. `motivo` e texto para o paciente. */
export type SituacaoJogo = {
  jogo: Jogo;
  disponivel: boolean;
  motivo: string | null;
};

/**
 * `PerguntaResponse`. Vem com o gabarito (`correta`) e os feedbacks ja renderizados: e treino,
 * nao prova, e o app corrige na hora. O backend recorrige ao receber o resultado.
 *
 * No item de categoria da mala, `categoria` vem preenchida e `medicamentoNome` guarda o rotulo
 * da categoria ("hidratacao"), porque a coluna nasceu `NOT NULL` (SPEC-013 §5.2).
 */
export type PerguntaJogo = {
  id: string;
  ordem: number;
  medicamentoNome: string;
  campo: CampoPergunta | null;
  categoria: CategoriaMissao | null;
  enunciado: string;
  opcoes: string[];
  correta: number;
  feedbackAcerto: string;
  feedbackCorrecao: string;
};

/** Uma missao do plano no Meu dia: entra em qualquer ponto do dia, so nao pode faltar. */
export type CartaLivre = {
  nome: string;
  categoria: CategoriaMissao | null;
};

/**
 * Um item da prateleira da mala. Objeto do catalogo tem `categoria`; caixa de remedio tem
 * `medicamentoNome` e `codigo === "REMEDIO"`.
 */
export type ItemPrateleira = {
  codigo: string;
  rotulo: string;
  categoria: CategoriaMissao | null;
  medicamentoNome: string | null;
};

/**
 * `RodadaResponse` de `POST /jogos/{jogo}/rodadas`. `cartasLivres` (Meu dia) e `prateleira`
 * (Arrume a mala) sao aditivos e nulos nos jogos da SPEC-012.
 */
export type RodadaJogo = {
  rodadaId: string;
  jogo: Jogo;
  campo: CampoPergunta | null;
  expiraEm: string;
  perguntas: PerguntaJogo[];
  cartasLivres: CartaLivre[];
  prateleira: ItemPrateleira[];
};

/** `RespostaRequest`: so indices. Quem acertou de primeira manda a mesma escolha nas duas. */
export type RespostaRodada = {
  perguntaId: string;
  escolhidaPrimeira: number;
  escolhidaFinal: number;
};

/** `ResultadoRequest` */
export type ResultadoRodadaRequest = {
  duracaoSeg: number;
  respostas: RespostaRodada[];
};

/** `ResultadoResponse`. `mensagem` ja vem pronta do template do backend. */
export type ResultadoRodada = {
  acertos: number;
  total: number;
  acertouTudo: boolean;
  primeiraDoDia: boolean;
  mensagem: string;
};

/** `RodadaResumoResponse` de `GET /jogos/rodadas`. */
export type RodadaResumo = {
  rodadaId: string;
  jogo: Jogo;
  campo: CampoPergunta | null;
  concluidaEm: string | null;
  acertos: number;
  total: number;
};
