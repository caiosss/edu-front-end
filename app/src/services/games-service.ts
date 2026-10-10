import axios from "axios";
import type {
  CampoPergunta,
  CartaLivre,
  CategoriaMissao,
  ItemPrateleira,
  Jogo,
  PerguntaJogo,
  ResultadoRodada,
  ResultadoRodadaRequest,
  RodadaJogo,
  RodadaResumo,
  SituacaoJogo,
} from "../features/games/types";
import { api, extractApiErrorMessage } from "./api";
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

const JOGOS: readonly Jogo[] = ["MULTIPLA_ESCOLHA", "ASSOCIACAO", "MEU_DIA", "ARRUME_A_MALA"];
const CAMPOS: readonly CampoPergunta[] = ["FREQUENCIA", "HORARIOS", "HORARIO_DOSE", "ITEM_MALA"];
const CATEGORIAS: readonly CategoriaMissao[] = [
  "ATIVIDADE_FISICA",
  "HIDRATACAO",
  "ALIMENTACAO",
  "DESCANSO",
  "OUTRO",
];

const asObject = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asInteger = (value: unknown): number | null => {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
};

const asJogo = (value: unknown): Jogo | null =>
  JOGOS.includes(value as Jogo) ? (value as Jogo) : null;

const asCampo = (value: unknown): CampoPergunta | null =>
  CAMPOS.includes(value as CampoPergunta) ? (value as CampoPergunta) : null;

/** Categoria que o app nao conhece vira `OUTRO`, como o client do education faz (SPEC-013 §5.2). */
const asCategoria = (value: unknown): CategoriaMissao | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return CATEGORIAS.includes(value as CategoriaMissao) ? (value as CategoriaMissao) : "OUTRO";
};

/** Missoes do Meu dia. Sem nome nao da carta; a lista e nula nos jogos da SPEC-012. */
const normalizeCartasLivres = (data: unknown): CartaLivre[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((item) => {
    const carta = asObject(item);
    const nome = asNonEmptyString(carta?.nome);

    return carta && nome ? [{ nome, categoria: asCategoria(carta.categoria) }] : [];
  });
};

/** Prateleira da mala: objeto do catalogo (tem `categoria`) ou caixa de remedio (`REMEDIO`). */
const normalizePrateleira = (data: unknown): ItemPrateleira[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.flatMap((item) => {
    const alvo = asObject(item);
    const codigo = asNonEmptyString(alvo?.codigo);
    const rotulo = asNonEmptyString(alvo?.rotulo);

    return alvo && codigo && rotulo
      ? [
          {
            codigo,
            rotulo,
            categoria: asCategoria(alvo.categoria),
            medicamentoNome: asNonEmptyString(alvo.medicamentoNome),
          },
        ]
      : [];
  });
};

const normalizePergunta = (data: unknown): PerguntaJogo | null => {
  const pergunta = asObject(data);
  const id = asNonEmptyString(pergunta?.id);
  const opcoes = Array.isArray(pergunta?.opcoes)
    ? pergunta.opcoes.filter((opcao): opcao is string => typeof opcao === "string")
    : [];
  const correta = asInteger(pergunta?.correta);

  if (!pergunta || !id || opcoes.length < 2 || correta === null) {
    return null;
  }

  if (correta < 0 || correta >= opcoes.length) {
    return null;
  }

  return {
    id,
    ordem: asInteger(pergunta.ordem) ?? 0,
    medicamentoNome: asNonEmptyString(pergunta.medicamentoNome) ?? "",
    campo: asCampo(pergunta.campo),
    categoria: asCategoria(pergunta.categoria),
    enunciado: asNonEmptyString(pergunta.enunciado) ?? "",
    opcoes,
    correta,
    feedbackAcerto: asNonEmptyString(pergunta.feedbackAcerto) ?? "",
    feedbackCorrecao: asNonEmptyString(pergunta.feedbackCorrecao) ?? "",
  };
};

/** Sem resposta do servidor: a nova tentativa deve reenviar a mesma `Idempotency-Key`. */
export class GameNetworkError extends FriendlyError {
  constructor() {
    super(ERROR_MESSAGES.network);
    this.name = "GameNetworkError";
  }
}

const toGamesError = (error: unknown, action: string): Error => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (!status) {
      return new GameNetworkError();
    }

    if (status === 401 || status === 403) {
      return new FriendlyError(ERROR_MESSAGES.session);
    }

    if (status >= 500) {
      return new FriendlyError(ERROR_MESSAGES.server);
    }

    // 409 traz o motivo pronto para o paciente (jogo indisponivel, rodada expirada ou encerrada).
    return new FriendlyError(
      extractApiErrorMessage(error.response?.data) ??
        `Não foi possível ${action} agora. Tente de novo.`
    );
  }

  return error instanceof Error ? error : new Error(`Falha ao ${action}.`);
};

/** `GET /jogos/disponiveis` */
export const fetchAvailableGames = async (): Promise<SituacaoJogo[]> => {
  try {
    const response = await api.get("/jogos/disponiveis");
    const lista = asObject(response.data)?.jogos;

    if (!Array.isArray(lista)) {
      throw new Error("Resposta de jogos disponíveis inválida.");
    }

    return lista.flatMap((item) => {
      const situacao = asObject(item);
      const jogo = asJogo(situacao?.jogo);

      return situacao && jogo
        ? [
            {
              jogo,
              disponivel: situacao.disponivel === true,
              motivo: asNonEmptyString(situacao.motivo),
            },
          ]
        : [];
    });
  } catch (error) {
    throw toGamesError(error, "carregar os jogos");
  }
};

/** `POST /jogos/{jogo}/rodadas` */
export const startGameRound = async (jogo: Jogo): Promise<RodadaJogo> => {
  try {
    const response = await api.post(`/jogos/${jogo}/rodadas`);
    const rodada = asObject(response.data);
    const rodadaId = asNonEmptyString(rodada?.rodadaId);
    const perguntas = Array.isArray(rodada?.perguntas)
      ? rodada.perguntas
          .map(normalizePergunta)
          .filter((pergunta): pergunta is PerguntaJogo => pergunta !== null)
          .sort((a, b) => a.ordem - b.ordem)
      : [];

    if (!rodada || !rodadaId || perguntas.length === 0) {
      throw new Error("Resposta de rodada inválida.");
    }

    const prateleira = normalizePrateleira(rodada.prateleira);

    // Sem prateleira nao ha o que colocar na mala: melhor recusar do que abrir uma rodada morta.
    if (jogo === "ARRUME_A_MALA" && prateleira.length === 0) {
      throw new Error("Resposta de rodada inválida.");
    }

    return {
      rodadaId,
      jogo: asJogo(rodada.jogo) ?? jogo,
      campo: asCampo(rodada.campo),
      expiraEm: asNonEmptyString(rodada.expiraEm) ?? "",
      perguntas,
      cartasLivres: normalizeCartasLivres(rodada.cartasLivres),
      prateleira,
    };
  } catch (error) {
    throw toGamesError(error, "abrir a rodada");
  }
};

/** `POST /jogos/rodadas/{id}/resultado` com `Idempotency-Key`. */
export const submitRoundResult = async (
  rodadaId: string,
  body: ResultadoRodadaRequest,
  idempotencyKey: string
): Promise<ResultadoRodada> => {
  try {
    const response = await api.post(
      `/jogos/rodadas/${encodeURIComponent(rodadaId)}/resultado`,
      body,
      { headers: { "Idempotency-Key": idempotencyKey } }
    );
    const resultado = asObject(response.data);
    const acertos = asInteger(resultado?.acertos);
    const total = asInteger(resultado?.total);

    if (!resultado || acertos === null || total === null) {
      throw new Error("Resposta de resultado inválida.");
    }

    return {
      acertos,
      total,
      acertouTudo: resultado.acertouTudo === true,
      primeiraDoDia: resultado.primeiraDoDia === true,
      mensagem: asNonEmptyString(resultado.mensagem) ?? "",
    };
  } catch (error) {
    throw toGamesError(error, "registrar a rodada");
  }
};

/** `GET /jogos/rodadas?limite=` */
export const fetchRoundHistory = async (limite = 5): Promise<RodadaResumo[]> => {
  try {
    const response = await api.get("/jogos/rodadas", { params: { limite } });

    if (!Array.isArray(response.data)) {
      throw new Error("Resposta de histórico de jogos inválida.");
    }

    return response.data.flatMap((item) => {
      const rodada = asObject(item);
      const rodadaId = asNonEmptyString(rodada?.rodadaId);
      const jogo = asJogo(rodada?.jogo);

      return rodada && rodadaId && jogo
        ? [
            {
              rodadaId,
              jogo,
              campo: asCampo(rodada.campo),
              concluidaEm: asNonEmptyString(rodada.concluidaEm),
              acertos: asInteger(rodada.acertos) ?? 0,
              total: asInteger(rodada.total) ?? 0,
            },
          ]
        : [];
    });
  } catch (error) {
    throw toGamesError(error, "carregar o histórico de jogos");
  }
};
