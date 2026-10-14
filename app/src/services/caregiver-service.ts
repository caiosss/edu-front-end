import axios from "axios";
import {
  ESCOPOS_CUIDADOR,
  type CaregiverInvitePayload,
  type CaregiverInviteResult,
  type CaregiverLink,
  type EscopoCuidador,
  type StatusVinculo,
} from "../features/caregivers/types";
import type { CaregiverProfileResponse } from "../features/profile/types";
import { api, extractApiErrorMessage } from "./api";
import { resolveCurrentPatientId } from "./patient-service";
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

const STATUS_VINCULO: StatusVinculo[] = ["PENDENTE", "ATIVO", "RECUSADO", "CONVIDADO", "REMOVIDO"];

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const asStatusVinculo = (value: unknown): StatusVinculo | null => {
  return STATUS_VINCULO.find((status) => status === value) ?? null;
};

/** Escopo desconhecido e ignorado: o backend pode ganhar escopos antes do app. */
const asEscopos = (value: unknown): EscopoCuidador[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return ESCOPOS_CUIDADOR.filter((escopo) => value.includes(escopo));
};

/** `CuidadorPerfilDTO`. Sem vinculo, os campos do paciente vem nulos e `escopos` vazio. */
const normalizeCaregiverProfileResponse = (data: unknown): CaregiverProfileResponse => {
  const parsedData = asObject(data);
  const id = asNonEmptyString(parsedData?.id);
  const nomeCompleto = asNonEmptyString(parsedData?.nomeCompleto);

  if (!parsedData || !id || !nomeCompleto) {
    throw new Error("Resposta de cuidador inválida.");
  }

  return {
    id,
    nomeCompleto,
    email: asNonEmptyString(parsedData.email),
    relacao: asNonEmptyString(parsedData.relacao),
    telefone: asNonEmptyString(parsedData.telefone),
    pacienteId: asNonEmptyString(parsedData.pacienteId),
    pacienteNome: asNonEmptyString(parsedData.pacienteNome),
    status: asStatusVinculo(parsedData.status),
    escopos: asEscopos(parsedData.escopos),
  };
};

/** `VinculoResponseDTO` */
const normalizeCaregiverLink = (data: unknown): CaregiverLink => {
  const parsedData = asObject(data);
  const id = asNonEmptyString(parsedData?.id);
  const cuidadorId = asNonEmptyString(parsedData?.cuidadorId);
  const status = asStatusVinculo(parsedData?.status);

  if (!parsedData || !id || !cuidadorId || !status) {
    throw new Error("Resposta de vínculo de cuidador inválida.");
  }

  return {
    id,
    cuidadorId,
    nomeCompleto: asNonEmptyString(parsedData.nomeCompleto) ?? "Cuidador",
    email: asNonEmptyString(parsedData.email),
    telefone: asNonEmptyString(parsedData.telefone),
    relacao: asNonEmptyString(parsedData.relacao),
    status,
    escopos: asEscopos(parsedData.escopos),
    dataVinculo: asNonEmptyString(parsedData.dataVinculo),
  };
};

/** `ConviteResponseDTO { vinculo, envio }` */
const normalizeInviteResult = (data: unknown): CaregiverInviteResult => {
  const parsedData = asObject(data);

  if (!parsedData) {
    throw new Error("Resposta de convite inválida.");
  }

  return {
    vinculo: normalizeCaregiverLink(parsedData.vinculo),
    envio: parsedData.envio === "ENVIADO" ? "ENVIADO" : "FALHOU",
  };
};

/**
 * Erros das rotas do paciente sobre os proprios cuidadores. O auth-service responde as regras
 * de negocio com o texto pronto (409 e-mail em uso ou limite de 3, 422 regra de escopo).
 */
const toCaregiverFriendlyError = (error: unknown, fallback: string): unknown => {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  const status = error.response?.status;
  const backendMessage = extractApiErrorMessage(error.response?.data);

  if (!status) {
    return new FriendlyError(ERROR_MESSAGES.network);
  }

  if (status === 401) {
    return new FriendlyError(ERROR_MESSAGES.session);
  }

  if (status === 400 || status === 409 || status === 422) {
    return new FriendlyError(backendMessage ?? fallback);
  }

  if (status === 403) {
    return new FriendlyError(backendMessage ?? "Você não tem acesso a este cuidador.");
  }

  if (status === 404) {
    return new FriendlyError("Não encontramos este cuidador. Atualize a tela e tente de novo.");
  }

  if (status >= 500) {
    return new FriendlyError(ERROR_MESSAGES.server);
  }

  return new FriendlyError(fallback);
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

/** Cuidadores `CONVIDADO` e `ATIVO` do paciente logado (SPEC-014 §5.7). */
export const fetchPatientCaregivers = async (): Promise<CaregiverLink[]> => {
  try {
    const pacienteId = await resolveCurrentPatientId();
    const response = await api.get(`/vinculos/paciente/${pacienteId}`);

    if (!Array.isArray(response.data)) {
      throw new Error("Resposta de cuidadores inválida.");
    }

    return response.data.map(normalizeCaregiverLink);
  } catch (error) {
    throw toCaregiverFriendlyError(
      error,
      "Não foi possível carregar os seus cuidadores agora. Tente de novo."
    );
  }
};

/**
 * O paciente convida um cuidador por e-mail (SPEC-014 §5.2). O cuidador cria a propria senha
 * pelo link; o paciente nunca a conhece.
 */
export const inviteCaregiver = async (
  payload: CaregiverInvitePayload
): Promise<CaregiverInviteResult> => {
  try {
    const response = await api.post("/cuidadores/convites", {
      nomeCompleto: payload.nomeCompleto.trim(),
      email: payload.email.trim().toLowerCase(),
      telefone: payload.telefone.trim() || null,
      relacao: payload.relacao.trim() || null,
    });
    return normalizeInviteResult(response.data);
  } catch (error) {
    throw toCaregiverFriendlyError(
      error,
      "Não foi possível enviar o convite agora. Tente de novo."
    );
  }
};

/** Novo link para quem nao recebeu ou deixou vencer; o anterior deixa de valer. */
export const resendCaregiverInvite = async (
  vinculoId: string
): Promise<CaregiverInviteResult> => {
  try {
    const response = await api.post(`/cuidadores/convites/${vinculoId}/reenviar`);
    return normalizeInviteResult(response.data);
  } catch (error) {
    throw toCaregiverFriendlyError(
      error,
      "Não foi possível reenviar o convite agora. Tente de novo."
    );
  }
};

/**
 * Substitui as permissoes do cuidador pelo conjunto enviado: revogar e mandar um conjunto
 * menor. `AGIR_PELO_PACIENTE` sem o termo ou sem os escopos de leitura volta 422.
 */
export const updateCaregiverScopes = async (
  vinculoId: string,
  escopos: EscopoCuidador[]
): Promise<CaregiverLink> => {
  try {
    const response = await api.put(`/vinculos/${vinculoId}/escopos`, escopos);
    return normalizeCaregiverLink(response.data);
  } catch (error) {
    throw toCaregiverFriendlyError(
      error,
      "Não foi possível salvar as permissões agora. Tente de novo."
    );
  }
};

/** Remove o cuidador: o vinculo vira `REMOVIDO` e a conta dele e desativada. */
export const removeCaregiver = async (vinculoId: string): Promise<void> => {
  try {
    await api.delete(`/vinculos/${vinculoId}`);
  } catch (error) {
    throw toCaregiverFriendlyError(
      error,
      "Não foi possível remover o cuidador agora. Tente de novo."
    );
  }
};
