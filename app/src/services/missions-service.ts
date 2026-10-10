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
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

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
    throw new Error("Resposta de planos de missões inválida.");
  }

  const planoId = asNonEmptyString(plano.id);
  const ativa = asBoolean(plano.ativa);

  if (!planoId || ativa === null || !Array.isArray(plano.itens)) {
    throw new Error("Resposta de planos de missões inválida.");
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
      throw new Error("Resposta de itens do plano de missões inválida.");
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
    throw new Error("Resposta de prescrições inválida.");
  }

  const prescricaoId = asNonEmptyString(prescricao.id);
  const ativo = asBoolean(prescricao.ativo);

  if (!prescricaoId || ativo === null || !Array.isArray(prescricao.itens)) {
    throw new Error("Resposta de prescrições inválida.");
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
      throw new Error("Resposta de itens de prescrição inválida.");
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
    throw new Error("Resposta de missões inválida.");
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
    throw new Error("Resposta de conclusão inválida: recompensa ausente.");
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
    throw new Error("Resposta de conclusão inválida: nível ausente.");
  }

  return { atual: Math.max(1, atual), xpNoNivel, xpParaProximo };
};

/** `ConclusaoResponseDTO { registro, recompensa, nivel }` */
const normalizeConclusaoResponse = (data: unknown): ConclusaoResponse => {
  const parsedData = asObject(data);

  if (!parsedData) {
    throw new Error("Resposta de conclusão inválida.");
  }

  return {
    registro: normalizeRegistro(parsedData.registro),
    recompensa: normalizeRecompensa(parsedData.recompensa),
    nivel: normalizeNivel(parsedData.nivel),
  };
};

export const fetchMyMissions = async (): Promise<MyMissionsResponse> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "Erro ao carregar missões."
    );
  }

  try {
    // O paciente vem do token: o backend nao aceita `pacienteId` aqui (SPEC-003 §1.1).
    const response = await api.get("/missoes/minhas");
    return normalizeMyMissionsResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        throw new FriendlyError(ERROR_MESSAGES.session);
      }

      if (status === 404) {
        throw new FriendlyError("Ainda não há medicamentos nem missões cadastrados para você.");
      }

      if (status === 400) {
        throw new Error("Requisição inválida ao carregar missões.");
      }

      if (status && status >= 500) {
        throw new FriendlyError(ERROR_MESSAGES.server);
      }

      if (!status) {
        throw new FriendlyError(ERROR_MESSAGES.network);
      }

      throw new FriendlyError(
        "Não foi possível carregar seus medicamentos e missões agora. Tente de novo."
      );
    }

    throw error;
  }
};

export class CompleteMissionNetworkError extends FriendlyError {
  constructor() {
    super(ERROR_MESSAGES.network);
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
    throw new Error("ID do item do plano ou da prescrição ausente.");
  }

  try {
    const pacienteId = await resolveCurrentPatientId();
    const response = await api.post(
      "/missoes/concluir",
      { pacienteId, planoMissaoItemId, prescricaoItemId },
      { headers: { "Idempotency-Key": idempotencyKey } }
    );
    return normalizeConclusaoResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const backendMessage = extractApiErrorMessage(error.response?.data);

      if (!status) {
        throw new CompleteMissionNetworkError();
      }

      if (status === 409) {
        throw new FriendlyError(backendMessage ?? "Este registro já foi feito.");
      }

      if (status === 401 || status === 403) {
        throw new FriendlyError(ERROR_MESSAGES.session);
      }

      if (status === 404) {
        throw new FriendlyError(
          backendMessage ?? "Não encontramos esse item no seu plano. Atualize a tela e tente de novo."
        );
      }

      if (status === 400) {
        throw new FriendlyError(backendMessage ?? "Não foi possível registrar agora. Tente de novo.");
      }

      if (status >= 500) {
        throw new FriendlyError(ERROR_MESSAGES.server);
      }

      throw new FriendlyError("Não foi possível registrar agora. Tente de novo.");
    }

    throw error;
  }
};
