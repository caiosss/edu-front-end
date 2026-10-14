import axios from "axios";
import type { ConsentTerm, PatientConsent } from "../features/caregivers/types";
import { api, extractApiErrorMessage } from "./api";
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

/**
 * Consentimentos do paciente (SPEC-003 §5.4). Todas as rotas agem sobre o proprio paciente do
 * token: nao ha parametro de paciente.
 */
export type TipoTermo = "USO_DADOS" | "PESQUISA" | "NOTIFICACAO" | "DELEGACAO_CUIDADOR";

/** Origem gravada junto da concessao (`ConcederConsentimentoDTO.origem`). */
const ORIGEM_APP = "APP_MOBILE";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const asInteger = (value: unknown): number | null => {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
};

/** `TermoResponseDTO` */
const normalizeTerm = (data: unknown): ConsentTerm => {
  const parsedData = asObject(data);
  const id = asNonEmptyString(parsedData?.id);
  const tipo = asNonEmptyString(parsedData?.tipo);
  const titulo = asNonEmptyString(parsedData?.titulo);
  const corpo = asNonEmptyString(parsedData?.corpo);

  if (!parsedData || !id || !tipo || !titulo || !corpo) {
    throw new Error("Resposta de termo inválida.");
  }

  return { id, tipo, versao: asInteger(parsedData.versao) ?? 1, titulo, corpo };
};

/** `ConsentimentoResponseDTO` */
const normalizeConsent = (data: unknown): PatientConsent => {
  const parsedData = asObject(data);
  const id = asNonEmptyString(parsedData?.id);
  const tipo = asNonEmptyString(parsedData?.tipo);

  if (!parsedData || !id || !tipo) {
    throw new Error("Resposta de consentimento inválida.");
  }

  return {
    id,
    tipo,
    versao: asInteger(parsedData.versao),
    titulo: asNonEmptyString(parsedData.titulo) ?? "",
    vigente: parsedData.vigente === true,
  };
};

const toConsentFriendlyError = (error: unknown, fallback: string): unknown => {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  const status = error.response?.status;

  if (!status) {
    return new FriendlyError(ERROR_MESSAGES.network);
  }

  if (status === 401) {
    return new FriendlyError(ERROR_MESSAGES.session);
  }

  if (status >= 500) {
    return new FriendlyError(ERROR_MESSAGES.server);
  }

  return new FriendlyError(extractApiErrorMessage(error.response?.data) ?? fallback);
};

/** O texto vigente do termo, para mostrar antes de pedir a concessao. */
export const fetchConsentTerm = async (tipo: TipoTermo): Promise<ConsentTerm> => {
  try {
    const response = await api.get(`/consentimentos/termos/${tipo}`);
    return normalizeTerm(response.data);
  } catch (error) {
    throw toConsentFriendlyError(
      error,
      "Não foi possível carregar o texto da autorização. Tente de novo."
    );
  }
};

/** O termo esta concedido e nao revogado. */
export const hasActiveConsent = async (tipo: TipoTermo): Promise<boolean> => {
  try {
    const response = await api.get("/consentimentos/meus");

    if (!Array.isArray(response.data)) {
      throw new Error("Resposta de consentimentos inválida.");
    }

    return response.data
      .map(normalizeConsent)
      .some((consent) => consent.tipo === tipo && consent.vigente);
  } catch (error) {
    throw toConsentFriendlyError(
      error,
      "Não foi possível conferir as suas autorizações agora. Tente de novo."
    );
  }
};

export const grantConsent = async (tipo: TipoTermo): Promise<void> => {
  try {
    await api.post("/consentimentos", { tipo, origem: ORIGEM_APP });
  } catch (error) {
    throw toConsentFriendlyError(error, "Não foi possível salvar a autorização. Tente de novo.");
  }
};

/**
 * Revogar `DELEGACAO_CUIDADOR` retira `AGIR_PELO_PACIENTE` de todos os cuidadores na mesma
 * transacao (SPEC-014 §5.3). Os escopos de leitura ficam.
 */
export const revokeConsent = async (tipo: TipoTermo): Promise<void> => {
  try {
    await api.delete(`/consentimentos/${tipo}`);
  } catch (error) {
    throw toConsentFriendlyError(error, "Não foi possível retirar a autorização. Tente de novo.");
  }
};
