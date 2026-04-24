import axios from "axios";
import type { CaregiverProfileResponse } from "../features/profile/types";
import { api } from "./api";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const normalizeCaregiverProfileResponse = (data: unknown): CaregiverProfileResponse => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de cuidador invalida.");
  }

  const parsedData = data as {
    nomeCompleto?: unknown;
    relacao?: unknown;
    telefone?: unknown;
  };

  const nomeCompleto = asNonEmptyString(parsedData.nomeCompleto);
  const relacao = asNonEmptyString(parsedData.relacao);
  const telefone = asNonEmptyString(parsedData.telefone);

  if (!nomeCompleto || !relacao || !telefone) {
    throw new Error("Resposta de cuidador invalida.");
  }

  return {
    nomeCompleto,
    relacao,
    telefone,
  };
};

export const fetchCaregiverProfileById = async (
  caregiverId: string
): Promise<CaregiverProfileResponse> => {
  if (!caregiverId.trim()) {
    throw new Error("ID de cuidador ausente.");
  }

  try {
    const response = await api.get(`/cuidadores/${caregiverId}`);
    return normalizeCaregiverProfileResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 404) {
        throw new Error("Cuidador nao encontrado.");
      }

      if (status === 400) {
        throw new Error("ID de cuidador invalido.");
      }

      if (!status) {
        throw new Error("Nao foi possivel conectar com a API de cuidadores.");
      }

      throw new Error(`Falha ao carregar perfil do cuidador (HTTP ${status}).`);
    }

    throw error;
  }
};
