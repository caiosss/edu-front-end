import axios from "axios";
import type { CaregiverProfileResponse } from "../features/profile/types";
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

const normalizeCaregiverProfileResponse = (data: unknown): CaregiverProfileResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de cuidador invalida.");
  }

  const parsedData = data as {
    id?: unknown;
    nomeCompleto?: unknown;
    nomePacientes?: unknown;
    pacientes?: unknown;
    relacao?: unknown;
    telefone?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const nomeCompleto = asNonEmptyString(parsedData.nomeCompleto);
  const nomePacientes = asStringArray(
    parsedData.pacientes ?? parsedData.nomePacientes
  );
  const relacao = asNonEmptyString(parsedData.relacao);
  const telefone = asNonEmptyString(parsedData.telefone);

  if (!id || !nomeCompleto || !relacao || !telefone) {
    throw new Error("Resposta de cuidador invalida.");
  }

  return {
    id,
    nomeCompleto,
    nomePacientes,
    relacao,
    telefone,
  };
};

export const fetchCurrentCaregiverProfile = async (): Promise<CaregiverProfileResponse> => {
  try {
    const response = await api.get("/cuidadores/me");
    return normalizeCaregiverProfileResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 404) {
        throw new Error("Cuidador não encontrado.");
      }

      if (status === 400) {
        throw new Error("ID de cuidador inválido.");
      }

      if (!status) {
        throw new Error("Não foi possível conectar com a API de cuidadores.");
      }

      throw new Error(`Falha ao carregar perfil do cuidador (HTTP ${status}).`);
    }

    throw error;
  }
};
