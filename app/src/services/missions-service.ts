import axios from "axios";
import type {
  CompleteMissionPayload,
  GeneralMissionResponse,
  MedicationMissionResponse,
  MyMissionsResponse,
} from "../features/home/types";
import { api } from "./api";
import { fetchCurrentPatientId } from "./patient-service";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

const asBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const normalizeCompletionMessage = (data: unknown): string => {
  if (typeof data === "string" && data.trim().length > 0) {
    return data.trim();
  }

  if (!data || typeof data !== "object") {
    return "Missao concluida com sucesso.";
  }

  const parsedData = data as {
    message?: unknown;
    mensagem?: unknown;
  };

  return (
    asNonEmptyString(parsedData.mensagem) ??
    asNonEmptyString(parsedData.message) ??
    "Missao concluida com sucesso."
  );
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

const normalizeGeneralMission = (data: unknown): GeneralMissionResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de missoes gerais invalida.");
  }

  const parsedData = data as {
    ativa?: unknown;
    categoria?: unknown;
    concluida?: unknown;
    dataInicio?: unknown;
    descricao?: unknown;
    id?: unknown;
    missaoId?: unknown;
    missaoNome?: unknown;
    missaoDescricao?: unknown;
    nome?: unknown;
    observacao?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const missaoId = asNonEmptyString(parsedData.missaoId);
  const nome =
    asNonEmptyString(parsedData.missaoNome) ?? asNonEmptyString(parsedData.nome);
  const categoria = asNonEmptyString(parsedData.categoria);
  const dataInicio = asNonEmptyString(parsedData.dataInicio);
  const ativa = asBoolean(parsedData.ativa);
  const concluida = asBoolean(parsedData.concluida) ?? false;

  if (!id || !missaoId || !nome || !categoria || !dataInicio || ativa === null) {
    throw new Error("Resposta de missoes gerais invalida.");
  }

  return {
    id,
    missaoId,
    nome,
    descricao:
      asString(parsedData.missaoDescricao) ?? asString(parsedData.descricao) ?? "",
    categoria,
    observacao: asString(parsedData.observacao) ?? "",
    dataInicio,
    ativa,
    concluida,
  };
};

const normalizeMedicationMission = (data: unknown): MedicationMissionResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de missoes de medicamento invalida.");
  }

  const parsedData = data as {
    ativo?: unknown;
    concluida?: unknown;
    concluido?: unknown;
    dosagem?: unknown;
    frequenciaHoras?: unknown;
    horarioPrimeiraDose?: unknown;
    id?: unknown;
    nomeMedicamento?: unknown;
    nomePaciente?: unknown;
    pacienteId?: unknown;
    tipoMedicamento?: unknown;
    userId?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const pacienteId =
    asNonEmptyString(parsedData.pacienteId) ?? asNonEmptyString(parsedData.userId);
  const nomePaciente = asNonEmptyString(parsedData.nomePaciente);
  const nomeMedicamento = asNonEmptyString(parsedData.nomeMedicamento);
  const frequenciaHoras = asNonNegativeInteger(parsedData.frequenciaHoras);
  const horarioPrimeiraDose = asNonEmptyString(parsedData.horarioPrimeiraDose);
  const ativo = asBoolean(parsedData.ativo);
  const concluida =
    asBoolean(parsedData.concluido) ?? asBoolean(parsedData.concluida) ?? false;

  if (
    !id ||
    !pacienteId ||
    !nomePaciente ||
    !nomeMedicamento ||
    frequenciaHoras === null ||
    !horarioPrimeiraDose ||
    ativo === null
  ) {
    throw new Error("Resposta de missoes de medicamento invalida.");
  }

  return {
    id,
    pacienteId,
    nomePaciente,
    nomeMedicamento,
    tipoMedicamento: asString(parsedData.tipoMedicamento) ?? "",
    dosagem: asString(parsedData.dosagem) ?? "",
    frequenciaHoras,
    horarioPrimeiraDose,
    ativo,
    concluida,
  };
};

const normalizeMyMissionsResponse = (data: unknown): MyMissionsResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de missoes invalida.");
  }

  const parsedData = data as {
    missoes?: unknown;
    prescricoes?: unknown;
    missoesGerais?: unknown;
    missoesMedicamento?: unknown;
  };

  const generalMissions = parsedData.missoes ?? parsedData.missoesGerais;
  const medicationMissions =
    parsedData.prescricoes ?? parsedData.missoesMedicamento;

  if (!Array.isArray(generalMissions) || !Array.isArray(medicationMissions)) {
    throw new Error("Resposta de missoes invalida.");
  }

  return {
    missoesGerais: generalMissions.map(normalizeGeneralMission),
    missoesMedicamento: medicationMissions.map(normalizeMedicationMission),
  };
};

export const fetchMyMissions = async (): Promise<MyMissionsResponse> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "Erro ao carregar missões."
    );
  }

  try {
    const pacienteId = await fetchCurrentPatientId();
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

export const completeMission = async (
  payload: CompleteMissionPayload
): Promise<string> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "Erro ao concluir missão."
    );
  }

  const missaoId = payload.missaoId?.trim();
  const prescricaoId = payload.prescricaoId?.trim();
  if (!missaoId && !prescricaoId) {
    throw new Error("ID da missao ou prescricao ausente.");
  }

  try {
    const pacienteId = await fetchCurrentPatientId();
    const response = await api.post("/missoes/concluir", {
      pacienteId,
      missaoId,
      prescricaoId,
    });
    return normalizeCompletionMessage(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        throw new Error("Sessão sem permissão para concluir missão.");
      }

      if (status === 404) {
        throw new Error("Missão não encontrada para conclusão.");
      }

      if (status === 400) {
        throw new Error("Requisição inválida ao concluir missão.");
      }

      if (status && status >= 500) {
        throw new Error("A API retornou erro interno ao concluir missão.");
      }

      if (!status) {
        throw new Error("Não foi possível conectar com a API de missões.");
      }

      throw new Error(`Falha ao concluir missão (HTTP ${status}).`);
    }

    throw error;
  }
};
