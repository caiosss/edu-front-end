import axios from "axios";
import type {
  GeneralMissionResponse,
  MedicationMissionResponse,
  MyMissionsResponse,
} from "../features/home/types";
import { api } from "./api";

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

const normalizeGeneralMission = (data: unknown): GeneralMissionResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de missoes gerais invalida.");
  }

  const parsedData = data as {
    ativa?: unknown;
    categoria?: unknown;
    dataInicio?: unknown;
    descricao?: unknown;
    id?: unknown;
    missaoId?: unknown;
    nome?: unknown;
    observacao?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const missaoId = asNonEmptyString(parsedData.missaoId);
  const nome = asNonEmptyString(parsedData.nome);
  const categoria = asNonEmptyString(parsedData.categoria);
  const dataInicio = asNonEmptyString(parsedData.dataInicio);
  const ativa = asBoolean(parsedData.ativa);

  if (!id || !missaoId || !nome || !categoria || !dataInicio || ativa === null) {
    throw new Error("Resposta de missoes gerais invalida.");
  }

  return {
    id,
    missaoId,
    nome,
    descricao: asString(parsedData.descricao) ?? "",
    categoria,
    observacao: asString(parsedData.observacao) ?? "",
    dataInicio,
    ativa,
  };
};

const normalizeMedicationMission = (data: unknown): MedicationMissionResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de missoes de medicamento invalida.");
  }

  const parsedData = data as {
    ativo?: unknown;
    dosagem?: unknown;
    frequenciaHoras?: unknown;
    horarioPrimeiraDose?: unknown;
    id?: unknown;
    nomeMedicamento?: unknown;
    nomePaciente?: unknown;
    tipoMedicamento?: unknown;
    userId?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const userId = asNonEmptyString(parsedData.userId);
  const nomePaciente = asNonEmptyString(parsedData.nomePaciente);
  const nomeMedicamento = asNonEmptyString(parsedData.nomeMedicamento);
  const frequenciaHoras = asNonNegativeInteger(parsedData.frequenciaHoras);
  const horarioPrimeiraDose = asNonEmptyString(parsedData.horarioPrimeiraDose);
  const ativo = asBoolean(parsedData.ativo);

  if (
    !id ||
    !userId ||
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
    userId,
    nomePaciente,
    nomeMedicamento,
    tipoMedicamento: asString(parsedData.tipoMedicamento) ?? "",
    dosagem: asString(parsedData.dosagem) ?? "",
    frequenciaHoras,
    horarioPrimeiraDose,
    ativo,
  };
};

const normalizeMyMissionsResponse = (data: unknown): MyMissionsResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de missoes invalida.");
  }

  const parsedData = data as {
    missoesGerais?: unknown;
    missoesMedicamento?: unknown;
  };

  if (!Array.isArray(parsedData.missoesGerais) || !Array.isArray(parsedData.missoesMedicamento)) {
    throw new Error("Resposta de missoes invalida.");
  }

  return {
    missoesGerais: parsedData.missoesGerais.map(normalizeGeneralMission),
    missoesMedicamento: parsedData.missoesMedicamento.map(normalizeMedicationMission),
  };
};

export const fetchMyMissions = async (): Promise<MyMissionsResponse> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "URL da API nao configurada. Defina EXPO_PUBLIC_API_URL no .env e reinicie o app."
    );
  }

  try {
    const response = await api.get("/missoes/minhas");
    return normalizeMyMissionsResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        throw new Error("Sessao sem permissao para carregar missoes.");
      }

      if (status === 404) {
        throw new Error("Nenhuma missao encontrada para este usuario.");
      }

      if (status === 400) {
        throw new Error("Requisicao invalida ao carregar missoes.");
      }

      if (status && status >= 500) {
        throw new Error("A API retornou erro interno ao carregar missoes.");
      }

      if (!status) {
        throw new Error("Nao foi possivel conectar com a API de missoes.");
      }

      throw new Error(`Falha ao carregar missoes (HTTP ${status}).`);
    }

    throw error;
  }
};
