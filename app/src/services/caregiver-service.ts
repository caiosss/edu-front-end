import axios from "axios";
import type { CaregiverProfileResponse } from "../features/profile/types";
import { api } from "./api";
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

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
    throw new Error("Resposta de cuidador inválida.");
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
    throw new Error("Resposta de cuidador inválida.");
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
        throw new FriendlyError("Não encontramos os dados do cuidador.");
      }

      if (status === 400) {
        throw new Error("ID de cuidador inválido.");
      }

      if (!status) {
        throw new FriendlyError(ERROR_MESSAGES.network);
      }

      throw new FriendlyError("Não foi possível carregar o seu perfil agora. Tente de novo.");
    }

    throw error;
  }
};
