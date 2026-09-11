import axios from "axios";
import type { Nivel } from "../features/gamification/types";
import { nivelFromLegacyProfile } from "../features/gamification/utils/level";
import type { PatientProfileResponse } from "../features/profile/types";
import { useAuthStore } from "../store/auth-store";
import { getPacienteIdFromToken } from "../utils/jwt";
import { api } from "./api";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return null;
  }

  return value;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

/**
 * Ha dois formatos de progresso em uso: o da SPEC-002 (`xpTotal`, `xpNoNivel`,
 * `xpParaProximo`) e o anterior, com `xpAtual` residual do nivel. Aceita os dois.
 */
const resolveProfileProgress = (data: {
  nivel?: unknown;
  xpAtual?: unknown;
  xpTotal?: unknown;
  xpNoNivel?: unknown;
  xpParaProximo?: unknown;
}): { nivel: Nivel; xpTotal: number } | null => {
  const nivel = asNonNegativeNumber(data.nivel);

  if (nivel === null) {
    return null;
  }

  const xpTotal = asNonNegativeNumber(data.xpTotal);
  const xpNoNivel = asNonNegativeNumber(data.xpNoNivel);
  const xpParaProximo = asNonNegativeNumber(data.xpParaProximo);

  if (xpTotal !== null && xpNoNivel !== null && xpParaProximo !== null) {
    return { nivel: { atual: Math.max(1, nivel), xpNoNivel, xpParaProximo }, xpTotal };
  }

  const xpAtual = asNonNegativeNumber(data.xpAtual);

  return xpAtual === null ? null : nivelFromLegacyProfile(nivel, xpAtual);
};

const normalizePatientProfileResponse = (data: unknown): PatientProfileResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de paciente invalida.");
  }

  const parsedData = data as {
    id?: unknown;
    dataTransplante?: unknown;
    moedas?: unknown;
    nivel?: unknown;
    nomeCompleto?: unknown;
    nomeCuidadores?: unknown;
    cuidadores?: unknown;
    tipoTransplante?: unknown;
    xpAtual?: unknown;
    xpTotal?: unknown;
    xpNoNivel?: unknown;
    xpParaProximo?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const nomeCompleto = asNonEmptyString(parsedData.nomeCompleto);
  const moedas = asNonNegativeNumber(parsedData.moedas);
  const progress = resolveProfileProgress(parsedData);
  const nomeCuidadores = asStringArray(
    parsedData.cuidadores ?? parsedData.nomeCuidadores
  );

  if (!id || !nomeCompleto) {
    throw new Error("Resposta de paciente invalida.");
  }

  if (!progress) {
    throw new Error("Resposta de paciente invalida: progresso ausente.");
  }

  return {
    id,
    dataTransplante: asNonEmptyString(parsedData.dataTransplante) ?? "",
    moedas: moedas ?? 0,
    nivel: progress.nivel.atual,
    nomeCompleto,
    nomeCuidadores,
    tipoTransplante: asNonEmptyString(parsedData.tipoTransplante) ?? "",
    xpTotal: progress.xpTotal,
    xpNoNivel: progress.nivel.xpNoNivel,
    xpParaProximo: progress.nivel.xpParaProximo,
  };
};

export const fetchCurrentPatientProfile = async (): Promise<PatientProfileResponse> => {
  try {
    const response = await api.get("/pacientes/me");
    return normalizePatientProfileResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 404) {
        throw new Error("Paciente nao encontrado.");
      }

      if (status === 400) {
        throw new Error("ID de paciente invalido.");
      }

      if (!status) {
        throw new Error("Nao foi possivel conectar com a API de pacientes.");
      }

      throw new Error(`Falha ao carregar perfil do paciente (HTTP ${status}).`);
    }

    throw error;
  }
};

export const fetchCurrentPatientId = async (): Promise<string> => {
  try {
    const response = await api.get("/pacientes/me");

    if (!response.data || typeof response.data !== "object") {
      throw new Error("Resposta de paciente invalida.");
    }

    const patientId = asNonEmptyString((response.data as { id?: unknown }).id);

    if (!patientId) {
      throw new Error("Resposta de paciente invalida: id ausente.");
    }

    return patientId;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 404) {
        throw new Error("Paciente da sessao nao encontrado.");
      }

      if (status === 401 || status === 403) {
        throw new Error("Sessao sem permissao para acessar o paciente.");
      }

      if (!status) {
        throw new Error("Nao foi possivel conectar com a API de pacientes.");
      }

      throw new Error(`Falha ao identificar o paciente (HTTP ${status}).`);
    }

    throw error;
  }
};

let cachedPatientId: { token: string; pacienteId: string } | null = null;

/**
 * Id do paciente da sessao. O token so traz a claim `pacienteId` a partir da SPEC-003; com a
 * API anterior, o id vem de `/pacientes/me` e fica guardado enquanto o token for o mesmo.
 */
export const resolveCurrentPatientId = async (): Promise<string> => {
  const token = useAuthStore.getState().token;
  const pacienteIdFromToken = getPacienteIdFromToken(token);

  if (pacienteIdFromToken) {
    return pacienteIdFromToken;
  }

  if (token && cachedPatientId?.token === token) {
    return cachedPatientId.pacienteId;
  }

  const pacienteId = await fetchCurrentPatientId();

  if (token) {
    cachedPatientId = { token, pacienteId };
  }

  return pacienteId;
};
