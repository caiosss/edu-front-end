import axios from "axios";
import type { PatientProfileResponse } from "../features/profile/types";
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
  };

  const id = asNonEmptyString(parsedData.id);
  const dataTransplante = asNonEmptyString(parsedData.dataTransplante);
  const nomeCompleto = asNonEmptyString(parsedData.nomeCompleto);
  const tipoTransplante = asNonEmptyString(parsedData.tipoTransplante);
  const moedas = asNonNegativeNumber(parsedData.moedas);
  const nivel = asNonNegativeNumber(parsedData.nivel);
  const xpAtual = asNonNegativeNumber(parsedData.xpAtual);
  const nomeCuidadores = asStringArray(
    parsedData.cuidadores ?? parsedData.nomeCuidadores
  );

  if (!id || !dataTransplante || !nomeCompleto || !tipoTransplante) {
    throw new Error("Resposta de paciente invalida.");
  }

  if (moedas === null || nivel === null || xpAtual === null) {
    throw new Error("Resposta de paciente invalida.");
  }

  return {
    id,
    dataTransplante,
    moedas,
    nivel,
    nomeCompleto,
    nomeCuidadores,
    tipoTransplante,
    xpAtual,
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
