import axios from "axios";
import type { LoginPayload, LoginResult } from "../features/login/types";
import { useAuthStore } from "../store/auth-store";
import { api } from "./api";

const invalidCredentialsCode = "INVALID_CREDENTIALS";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const normalizeLoginResponse = (data: unknown): LoginResult => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de autenticacao invalida.");
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
    throw new Error("Resposta de autenticacao invalida: token ausente.");
  }

  if (!id) {
    throw new Error("Resposta de autenticacao invalida: id ausente.");
  }

  if (!tipoUsuario) {
    throw new Error("Resposta de autenticacao invalida: tipoUsuario ausente.");
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
    super("Credenciais invalidas.");
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
