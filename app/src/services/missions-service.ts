import axios from "axios";
import type {
  ConclusaoResponse,
  Nivel,
  Recompensa,
  RegraAplicada,
  Registro,
} from "../features/gamification/types";
import type {
  CompleteMissionPayload,
  GeneralMissionResponse,
  MedicationMissionResponse,
  MyMissionsResponse,
} from "../features/home/types";
import { api, extractApiErrorMessage } from "./api";
import { resolveCurrentPatientId } from "./patient-service";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

const asBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const asNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }

  return null;
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

/** `PlanoMissaoResponseDTO.itens[]` achatado com os dados do plano. */
const normalizePlanItems = (data: unknown): GeneralMissionResponse[] => {
  const plano = asObject(data);

  if (!plano) {
    throw new Error("Resposta de planos de missoes invalida.");
  }

  const planoId = asNonEmptyString(plano.id);
  const ativa = asBoolean(plano.ativa);

  if (!planoId || ativa === null || !Array.isArray(plano.itens)) {
    throw new Error("Resposta de planos de missoes invalida.");
  }

  const planoNome = asString(plano.nome) ?? "";
  const observacao = asString(plano.observacao) ?? "";
  const dataInicio = asString(plano.dataInicio) ?? "";

  return plano.itens.map((rawItem) => {
    const item = asObject(rawItem);
    const id = asNonEmptyString(item?.id);
    const missaoId = asNonEmptyString(item?.missaoId);
    const nome = asNonEmptyString(item?.nomeMissao);

    if (!item || !id || !missaoId || !nome) {
      throw new Error("Resposta de itens do plano de missoes invalida.");
    }

    return {
      id,
      missaoId,
      planoId,
      planoNome,
      nome,
      descricao: asString(item.descricaoMissao) ?? "",
      categoria: asString(item.categoria) ?? "OUTRO",
      observacao,
      dataInicio,
      ativa,
      concluida: asBoolean(item.concluida) ?? false,
    };
  });
};

/** `PrescricaoResponseDTO.itens[]` achatado com os dados da prescricao. */
const normalizePrescriptionItems = (data: unknown): MedicationMissionResponse[] => {
  const prescricao = asObject(data);

  if (!prescricao) {
    throw new Error("Resposta de prescricoes invalida.");
  }

  const prescricaoId = asNonEmptyString(prescricao.id);
  const ativo = asBoolean(prescricao.ativo);

  if (!prescricaoId || ativo === null || !Array.isArray(prescricao.itens)) {
    throw new Error("Resposta de prescricoes invalida.");
  }

  const pacienteId = asString(prescricao.pacienteId) ?? "";
  const nomePaciente = asString(prescricao.nomePaciente) ?? "";

  return prescricao.itens.map((rawItem) => {
    const item = asObject(rawItem);
    const id = asNonEmptyString(item?.id);
    const nomeMedicamento = asNonEmptyString(item?.nomeMedicamento);
    const frequenciaHoras = asNonNegativeInteger(item?.frequenciaHoras);
    const horarioPrimeiraDose = asNonEmptyString(item?.horarioPrimeiraDose);

    if (!item || !id || !nomeMedicamento || frequenciaHoras === null || !horarioPrimeiraDose) {
      throw new Error("Resposta de itens de prescricao invalida.");
    }

    return {
      id,
      prescricaoId,
      pacienteId,
      nomePaciente,
      nomeMedicamento,
      tipoMedicamento: asString(item.tipoMedicamento) ?? "",
      dosagem: asString(item.dosagem) ?? "",
      frequenciaHoras,
      horarioPrimeiraDose,
      ativo,
      concluida: asBoolean(item.concluido) ?? false,
    };
  });
};

/** `MinhasMissoesResponseDTO { planos, prescricoes }` */
const normalizeMyMissionsResponse = (data: unknown): MyMissionsResponse => {
  const parsedData = asObject(data);

  if (!parsedData || !Array.isArray(parsedData.planos) || !Array.isArray(parsedData.prescricoes)) {
    throw new Error("Resposta de missoes invalida.");
  }

  return {
    missoesGerais: parsedData.planos.flatMap(normalizePlanItems),
    missoesMedicamento: parsedData.prescricoes.flatMap(normalizePrescriptionItems),
  };
};

const normalizeRegistro = (data: unknown): Registro | null => {
  const registro = asObject(data);

  if (!registro || (registro.tipo !== "MISSAO" && registro.tipo !== "DOSE")) {
    return null;
  }

  const progresso = asObject(registro.progressoDoDia);
  const registradas = asNonNegativeInteger(progresso?.registradas);
  const previstas = asNonNegativeInteger(progresso?.previstas);

  return {
    tipo: registro.tipo,
    horarioPrevisto: asNonEmptyString(registro.horarioPrevisto),
    horarioRegistrado: asNonEmptyString(registro.horarioRegistrado),
    dentroDaJanela: asBoolean(registro.dentroDaJanela),
    progressoDoDia:
      registradas !== null && previstas !== null ? { registradas, previstas } : null,
  };
};

const normalizeRecompensa = (data: unknown): Recompensa => {
  const recompensa = asObject(data);

  if (!recompensa) {
    throw new Error("Resposta de conclusao invalida: recompensa ausente.");
  }

  const regras: RegraAplicada[] = Array.isArray(recompensa.regras)
    ? recompensa.regras.flatMap((rawRegra) => {
        const regra = asObject(rawRegra);
        const codigo = asNonEmptyString(regra?.codigo);

        return codigo ? [{ codigo, versao: asNonNegativeInteger(regra?.versao) }] : [];
      })
    : [];

  return {
    xp: asNonNegativeInteger(recompensa.xp) ?? 0,
    regras,
    motivo: asNonEmptyString(recompensa.motivo),
    limiteAtingido: asBoolean(recompensa.limiteAtingido) ?? false,
  };
};

const normalizeNivel = (data: unknown): Nivel => {
  const nivel = asObject(data);
  const atual = asNonNegativeInteger(nivel?.atual);
  const xpNoNivel = asNonNegativeInteger(nivel?.xpNoNivel);
  const xpParaProximo = asNonNegativeInteger(nivel?.xpParaProximo);

  if (atual === null || xpNoNivel === null || xpParaProximo === null) {
    throw new Error("Resposta de conclusao invalida: nivel ausente.");
  }

  return { atual: Math.max(1, atual), xpNoNivel, xpParaProximo };
};

const LEGACY_XP_PATTERN = /(\d+)\s*XP/i;

/**
 * API anterior a SPEC-002: a conclusao respondia so o texto "Parabéns! Você ganhou N XP!",
 * sem registro clinico nem nivel. Converte para o mesmo formato sem inventar o que o texto
 * nao diz — o nivel chega depois, pelo perfil.
 */
const normalizeLegacyConclusao = (
  message: string,
  payload: CompleteMissionPayload
): ConclusaoResponse => {
  const xpMatch = message.match(LEGACY_XP_PATTERN);

  return {
    registro: {
      tipo: payload.prescricaoItemId ? "DOSE" : "MISSAO",
      horarioPrevisto: null,
      horarioRegistrado: null,
      dentroDaJanela: null,
      progressoDoDia: null,
    },
    recompensa: {
      xp: xpMatch ? Number.parseInt(xpMatch[1], 10) : 0,
      regras: [],
      motivo: null,
      limiteAtingido: false,
    },
    nivel: null,
  };
};

/** `ConclusaoResponseDTO { registro, recompensa, nivel }`, ou o texto da API anterior. */
const normalizeConclusaoResponse = (
  data: unknown,
  payload: CompleteMissionPayload
): ConclusaoResponse => {
  if (typeof data === "string") {
    return normalizeLegacyConclusao(data, payload);
  }

  const parsedData = asObject(data);

  if (!parsedData) {
    throw new Error("Resposta de conclusao invalida.");
  }

  return {
    registro: normalizeRegistro(parsedData.registro),
    recompensa: normalizeRecompensa(parsedData.recompensa),
    nivel:
      parsedData.nivel === undefined || parsedData.nivel === null
        ? null
        : normalizeNivel(parsedData.nivel),
  };
};

export const fetchMyMissions = async (): Promise<MyMissionsResponse> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "Erro ao carregar missões."
    );
  }

  try {
    // A API anterior a SPEC-003 exige `pacienteId`; a atual tira o paciente do token e
    // ignora o parametro. Enviar sempre atende as duas.
    const pacienteId = await resolveCurrentPatientId();
    const response = await api.get("/missoes/minhas", {
      params: { pacienteId },
    });
    return normalizeMyMissionsResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        throw new Error("Sessão sem permissão para carregar missões.");
      }

      if (status === 404) {
        throw new Error("Nenhuma missão encontrada para este usuário.");
      }

      if (status === 400) {
        throw new Error("Requisição invalida ao carregar missões.");
      }

      if (status && status >= 500) {
        throw new Error("A API retornou erro interno ao carregar missões.");
      }

      if (!status) {
        throw new Error("Não foi possível conectar com a API de missões.");
      }

      throw new Error(`Falha ao carregar missões (HTTP ${status}).`);
    }

    throw error;
  }
};

export class CompleteMissionNetworkError extends Error {
  constructor() {
    super("Não foi possível conectar com a API de missões.");
    this.name = "CompleteMissionNetworkError";
  }
}

export const completeMission = async (
  payload: CompleteMissionPayload,
  idempotencyKey: string
): Promise<ConclusaoResponse> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "Erro ao concluir missão."
    );
  }

  const planoMissaoItemId = payload.planoMissaoItemId?.trim() || null;
  const prescricaoItemId = payload.prescricaoItemId?.trim() || null;

  if (!planoMissaoItemId && !prescricaoItemId) {
    throw new Error("ID do item do plano ou da prescricao ausente.");
  }

  try {
    const pacienteId = await resolveCurrentPatientId();
    const response = await api.post(
      "/missoes/concluir",
      { pacienteId, planoMissaoItemId, prescricaoItemId },
      { headers: { "Idempotency-Key": idempotencyKey } }
    );
    return normalizeConclusaoResponse(response.data, payload);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const backendMessage = extractApiErrorMessage(error.response?.data);

      if (!status) {
        throw new CompleteMissionNetworkError();
      }

      if (status === 409) {
        throw new Error(backendMessage ?? "Este registro já foi feito.");
      }

      if (status === 401 || status === 403) {
        throw new Error("Sessão sem permissão para concluir missão.");
      }

      if (status === 404) {
        throw new Error(backendMessage ?? "Missão não encontrada para conclusão.");
      }

      if (status === 400) {
        throw new Error(backendMessage ?? "Requisição inválida ao concluir missão.");
      }

      if (status >= 500) {
        throw new Error("A API retornou erro interno ao concluir missão.");
      }

      throw new Error(`Falha ao concluir missão (HTTP ${status}).`);
    }

    throw error;
  }
};
