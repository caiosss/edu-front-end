import axios from "axios";
import type { Conquista, ConquistaPaciente } from "../features/gamification/types";
import { api } from "./api";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" ? value : null;
};

const asNonNegativeNumber = (value: unknown): number | null => {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0 ? value : null;
};

/** `ConquistaResponseDTO { id, titulo, descricao, requisitoXp, icone }` */
const normalizeConquista = (data: unknown): Conquista | null => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const parsedData = data as {
    id?: unknown;
    titulo?: unknown;
    descricao?: unknown;
    requisitoXp?: unknown;
    icone?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const titulo = asNonEmptyString(parsedData.titulo);

  if (!id || !titulo) {
    return null;
  }

  return {
    id,
    titulo,
    descricao: asString(parsedData.descricao) ?? "",
    requisitoXp: asNonNegativeNumber(parsedData.requisitoXp) ?? 0,
    icone: asString(parsedData.icone) ?? "",
  };
};

/** `ConquistaPacienteResponseDTO { id, pacienteId, conquista, dataConquista }` */
const normalizeConquistaPaciente = (data: unknown): ConquistaPaciente | null => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const parsedData = data as {
    id?: unknown;
    pacienteId?: unknown;
    conquista?: unknown;
    dataConquista?: unknown;
  };

  const id = asNonEmptyString(parsedData.id);
  const conquista = normalizeConquista(parsedData.conquista);

  if (!id || !conquista) {
    return null;
  }

  return {
    id,
    pacienteId: asString(parsedData.pacienteId) ?? "",
    conquista,
    dataConquista: asNonEmptyString(parsedData.dataConquista),
  };
};

const toAchievementsError = (error: unknown, action: string): Error => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      return new Error(`Sessão sem permissão para ${action}.`);
    }

    if (!status) {
      return new Error("Não foi possível conectar com a API de conquistas.");
    }

    return new Error(`Falha ao ${action} (HTTP ${status}).`);
  }

  return error instanceof Error ? error : new Error(`Falha ao ${action}.`);
};

export const fetchAchievementCatalog = async (): Promise<Conquista[]> => {
  try {
    const response = await api.get("/conquistas");

    if (!Array.isArray(response.data)) {
      throw new Error("Resposta de conquistas invalida.");
    }

    return response.data
      .map(normalizeConquista)
      .filter((conquista): conquista is Conquista => conquista !== null);
  } catch (error) {
    throw toAchievementsError(error, "carregar conquistas");
  }
};

export const fetchPatientAchievements = async (
  pacienteId: string
): Promise<ConquistaPaciente[]> => {
  try {
    const response = await api.get(`/conquistas/paciente/${encodeURIComponent(pacienteId)}`);

    if (!Array.isArray(response.data)) {
      throw new Error("Resposta de conquistas do paciente invalida.");
    }

    return response.data
      .map(normalizeConquistaPaciente)
      .filter((conquista): conquista is ConquistaPaciente => conquista !== null);
  } catch (error) {
    throw toAchievementsError(error, "carregar suas conquistas");
  }
};
