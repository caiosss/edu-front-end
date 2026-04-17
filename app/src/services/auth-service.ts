import axios from "axios";
import type { LoginPayload, LoginResult } from "../features/login/types";
import { api } from "./api";

const invalidCredentialsCode = "INVALID_CREDENTIALS";

const isFakeApiUrl = (baseURL: string | undefined): boolean => {
  if (!baseURL) {
    return true;
  }

  return /example\.com/i.test(baseURL);
};

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
    refreshToken?: unknown;
  };

  const token =
    asNonEmptyString(parsedData.token) ?? asNonEmptyString(parsedData.accessToken);

  if (!token) {
    throw new Error("Resposta de autenticacao invalida: token ausente.");
  }

  return {
    token,
    refreshToken: asNonEmptyString(parsedData.refreshToken),
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
  // Enquanto o backend nao estiver disponivel, evita falha de rede com URL fake.
  if (isFakeApiUrl(api.defaults.baseURL)) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { token: `mock-token-${Date.now()}` };
  }

  try {
    const response = await api.post("/auth/login", payload);
    return normalizeLoginResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new InvalidCredentialsError();
    }

    throw error;
  }
};
