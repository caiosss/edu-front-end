import axios from "axios";
import type { LoginPayload, LoginResult } from "../features/login/types";
import { useAuthStore } from "../store/auth-store";
import { api, extractApiErrorMessage } from "./api";
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

const invalidCredentialsCode = "INVALID_CREDENTIALS";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const normalizeLoginResponse = (data: unknown): LoginResult => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de autenticação inválida.");
  }

  const parsedData = data as {
    token?: unknown;
    accessToken?: unknown;
    id?: unknown;
    userId?: unknown;
    tipoUsuario?: unknown;
    userType?: unknown;
  };

  const token =
    asNonEmptyString(parsedData.token) ?? asNonEmptyString(parsedData.accessToken);
  const id = asNonEmptyString(parsedData.id) ?? asNonEmptyString(parsedData.userId);
  const tipoUsuario =
    asNonEmptyString(parsedData.tipoUsuario) ?? asNonEmptyString(parsedData.userType);

  if (!token) {
    throw new Error("Resposta de autenticação inválida: token ausente.");
  }

  if (!id) {
    throw new Error("Resposta de autenticação inválida: id ausente.");
  }

  if (!tipoUsuario) {
    throw new Error("Resposta de autenticação inválida: tipoUsuario ausente.");
  }

  return {
    token,
    id,
    tipoUsuario,
  };
};

export class InvalidCredentialsError extends Error {
  code = invalidCredentialsCode;

  constructor() {
    super("E-mail ou senha incorretos.");
    this.name = "InvalidCredentialsError";
  }
}

export const isInvalidCredentialsError = (
  error: unknown
): error is InvalidCredentialsError => {
  if (error instanceof InvalidCredentialsError) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  return (error as { code?: string }).code === invalidCredentialsCode;
};

export const loginUser = async (payload: LoginPayload): Promise<LoginResult> => {
  try {
    const response = await api.post("/auth/login", payload);
    const session = normalizeLoginResponse(response.data);
    useAuthStore.getState().setSession(session);
    return session;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      throw new InvalidCredentialsError();
    }

    throw error;
  }
};

/**
 * O cuidador cria a senha com o token do e-mail e ja entra (SPEC-014 §5.2). Token invalido,
 * usado ou vencido volta 400 com uma mensagem unica, que nao diz qual dos casos foi.
 */
export const activateCaregiverInvite = async (
  token: string,
  senha: string,
  termoUsoVersao: number
): Promise<LoginResult> => {
  try {
    const response = await api.post("/auth/convites/ativar", {
      token: token.trim(),
      senha,
      termoUsoVersao,
    });
    const session = normalizeLoginResponse(response.data);
    useAuthStore.getState().setSession(session);
    return session;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const backendMessage = extractApiErrorMessage(error.response?.data);

      if (status === 400) {
        throw new FriendlyError(
          backendMessage ?? "Convite inválido ou vencido. Peça ao paciente um novo convite."
        );
      }

      if (status && status >= 500) {
        throw new FriendlyError(ERROR_MESSAGES.server);
      }

      if (!status) {
        throw new FriendlyError(ERROR_MESSAGES.network);
      }

      throw new FriendlyError("Não foi possível ativar o convite agora. Tente de novo.");
    }

    throw error;
  }
};
