import axios from "axios";
import { api, extractApiErrorMessage } from "./api";
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

/**
 * Termos de Uso e Politica de Privacidade (auth-service, `/auth/termos-uso`). O texto vem do
 * backend, versionado: o app nunca escreve o termo por conta propria.
 */
export type TermoUso = {
  versao: number;
  titulo: string;
  corpo: string;
};

export type SituacaoTermoUso = {
  pendente: boolean;
  aceitoEm: string | null;
  termo: TermoUso;
};

/** Origem gravada junto do aceite feito depois do login (versao nova do termo). */
const ORIGEM_APP = "APP_MOBILE";

const normalizeTermo = (data: unknown): TermoUso => {
  const parsed = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const versao = parsed?.versao;
  const titulo = parsed?.titulo;
  const corpo = parsed?.corpo;

  if (
    typeof versao !== "number" ||
    typeof titulo !== "string" ||
    typeof corpo !== "string" ||
    !corpo.trim()
  ) {
    throw new Error("Resposta de termos inválida.");
  }

  return { versao, titulo, corpo };
};

const normalizeSituacao = (data: unknown): SituacaoTermoUso => {
  const parsed = data && typeof data === "object" ? (data as Record<string, unknown>) : null;

  if (!parsed || typeof parsed.pendente !== "boolean") {
    throw new Error("Resposta de termos inválida.");
  }

  return {
    pendente: parsed.pendente,
    aceitoEm: typeof parsed.aceitoEm === "string" ? parsed.aceitoEm : null,
    termo: normalizeTermo(parsed.termo),
  };
};

const toTermsFriendlyError = (error: unknown, fallback: string): unknown => {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  const status = error.response?.status;

  if (!status) {
    return new FriendlyError(ERROR_MESSAGES.network);
  }

  if (status >= 500) {
    return new FriendlyError(ERROR_MESSAGES.server);
  }

  return new FriendlyError(extractApiErrorMessage(error.response?.data) ?? fallback);
};

/** Publico: a tela de cadastro mostra o texto antes de existir conta. */
export const fetchTermoUsoVigente = async (): Promise<TermoUso> => {
  try {
    const response = await api.get("/auth/termos-uso/vigente");
    return normalizeTermo(response.data);
  } catch (error) {
    throw toTermsFriendlyError(error, "Não foi possível carregar os termos. Tente de novo.");
  }
};

export const fetchSituacaoTermoUso = async (): Promise<SituacaoTermoUso> => {
  try {
    const response = await api.get("/auth/termos-uso/situacao");
    return normalizeSituacao(response.data);
  } catch (error) {
    throw toTermsFriendlyError(error, "Não foi possível conferir os termos. Tente de novo.");
  }
};

/** 409 quando o termo mudou depois de lido: a tela recarrega o texto novo. */
export const aceitarTermoUso = async (versao: number): Promise<SituacaoTermoUso> => {
  try {
    const response = await api.post("/auth/termos-uso/aceite", { versao, origem: ORIGEM_APP });
    return normalizeSituacao(response.data);
  } catch (error) {
    throw toTermsFriendlyError(error, "Não foi possível registrar o seu aceite. Tente de novo.");
  }
};
