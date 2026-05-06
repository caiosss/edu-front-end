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
    dataTransplante?: unknown;
    moedas?: unknown;
    nivel?: unknown;
    nomeCompleto?: unknown;
    nomeCuidadores?: unknown;
    tipoTransplante?: unknown;
    xpAtual?: unknown;
  };

  const dataTransplante = asNonEmptyString(parsedData.dataTransplante);
  const nomeCompleto = asNonEmptyString(parsedData.nomeCompleto);
  const tipoTransplante = asNonEmptyString(parsedData.tipoTransplante);
  const moedas = asNonNegativeNumber(parsedData.moedas);
  const nivel = asNonNegativeNumber(parsedData.nivel);
  const xpAtual = asNonNegativeNumber(parsedData.xpAtual);
  const nomeCuidadores = asStringArray(parsedData.nomeCuidadores);

  if (!dataTransplante || !nomeCompleto || !tipoTransplante) {
    throw new Error("Resposta de paciente invalida.");
  }

  if (moedas === null || nivel === null || xpAtual === null) {
    throw new Error("Resposta de paciente invalida.");
  }

  return {
    dataTransplante,
    moedas,
    nivel,
    nomeCompleto,
    nomeCuidadores,
    tipoTransplante,
    xpAtual,
  };
};

export const fetchPatientProfileById = async (
  patientId: string
): Promise<PatientProfileResponse> => {
  if (!patientId.trim()) {
    throw new Error("ID de paciente ausente.");
  }

  try {
    const response = await api.get(`/pacientes/${patientId}`);
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
