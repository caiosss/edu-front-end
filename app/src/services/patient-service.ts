import axios from "axios";
import type { PatientProfileResponse } from "../features/profile/types";
import { useAuthStore } from "../store/auth-store";
import { getPacienteIdFromToken } from "../utils/jwt";
import { api } from "./api";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
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
 * `PacienteResponseDTO`. XP, nivel e moedas ainda vem neste endpoint, mas sao legado em
 * coexistencia (SPEC-004 §5.6): o progresso e lido de `/gamification/perfil`.
 */
const normalizePatientProfileResponse = (data: unknown): PatientProfileResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de paciente invalida.");
  }

  const parsedData = data as {
    id?: unknown;
    dataTransplante?: unknown;
    nomeCompleto?: unknown;
    nomeCuidadores?: unknown;
    cuidadores?: unknown;
    tipoTransplante?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const nomeCompleto = asNonEmptyString(parsedData.nomeCompleto);

  if (!id || !nomeCompleto) {
    throw new Error("Resposta de paciente invalida.");
  }

  return {
    id,
    dataTransplante: asNonEmptyString(parsedData.dataTransplante) ?? "",
    nomeCompleto,
    nomeCuidadores: asStringArray(parsedData.cuidadores ?? parsedData.nomeCuidadores),
    tipoTransplante: asNonEmptyString(parsedData.tipoTransplante) ?? "",
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
 * Id do paciente da sessao: a claim `pacienteId` do token (SPEC-003 §5.1) ou, sem ela,
 * `/pacientes/me`, guardado enquanto o token for o mesmo.
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
