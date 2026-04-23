import axios from "axios";
import type { RegisterPayload } from "../features/register/types";
import { api } from "./api";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

export const registerUser = async (payload: RegisterPayload): Promise<void> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "URL da API nao configurada. Defina EXPO_PUBLIC_API_URL no .env e reinicie o app."
    );
  }

  try {
    console.log(payload)

    await api.post("/auth/register", payload);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseData = error.response?.data as
        | { erro?: unknown; message?: unknown }
        | undefined;

      const backendMessage =
        asNonEmptyString(responseData?.erro) ?? asNonEmptyString(responseData?.message);

      if (status === 409) {
        throw new Error(backendMessage ?? "Este e-mail ja esta cadastrado.");
      }

      if (status === 400) {
        throw new Error(backendMessage ?? "Dados de cadastro invalidos.");
      }

      if (status && status >= 500) {
        throw new Error(backendMessage ?? "A API retornou erro interno no cadastro.");
      }

      if (!status) {
        throw new Error("Nao foi possivel conectar com a API de cadastro.");
      }

      throw new Error(backendMessage ?? `Falha ao cadastrar (HTTP ${status}).`);
    }

    throw error;
  }
};
