import axios from "axios";
import type { LoginResult } from "../features/login/types";
import type { RegisterPayload } from "../features/register/types";
import { api } from "./api";
import { fetchCurrentPatientId } from "./patient-service";
import { ERROR_MESSAGES, FriendlyError } from "../utils/friendly-error";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const extractBackendMessage = (data: unknown): string | null => {
  if (typeof data === "string") {
    return asNonEmptyString(data);
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const parsedData = data as { erro?: unknown; message?: unknown };
  return (
    asNonEmptyString(parsedData.erro) ?? asNonEmptyString(parsedData.message)
  );
};

const normalizeRegistrationResponse = (data: unknown): LoginResult => {
  if (!data || typeof data !== "object") {
    throw new Error("Resposta de cadastro inválida.");
  }

  const parsedData = data as {
    id?: unknown;
    tipoUsuario?: unknown;
    token?: unknown;
  };
  const id = asNonEmptyString(parsedData.id);
  const tipoUsuario = asNonEmptyString(parsedData.tipoUsuario);
  const token = asNonEmptyString(parsedData.token);

  if (!id || !tipoUsuario || !token) {
    throw new Error("Resposta de cadastro inválida.");
  }

  return { id, tipoUsuario, token };
};

export const registerUser = async (payload: RegisterPayload): Promise<LoginResult> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "URL da API não configurada. Defina EXPO_PUBLIC_API_URL no .env e reinicie o app."
    );
  }

  try {
    const response = await api.post("/auth/register", payload);
    return normalizeRegistrationResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const backendMessage = extractBackendMessage(error.response?.data);

      if (status === 409) {
        throw new FriendlyError(backendMessage ?? "Este e-mail já está cadastrado.");
      }

      if (status === 400) {
        throw new FriendlyError(
          backendMessage ?? "Alguns dados do cadastro estão incorretos. Confira e tente de novo."
        );
      }

      if (status && status >= 500) {
        throw new FriendlyError(ERROR_MESSAGES.server);
      }

      if (!status) {
        throw new FriendlyError(ERROR_MESSAGES.network);
      }

      throw new FriendlyError(
        backendMessage ?? "Não foi possível concluir o cadastro agora. Tente de novo."
      );
    }

    throw error;
  }
};

export const registerCaregiverAndCreateLink = async (
  payload: RegisterPayload
): Promise<void> => {
  if (payload.tipoUsuario !== "CUIDADOR") {
    throw new Error("Tipo de usuário inválido para cadastrar cuidador.");
  }

  // Resolve o paciente antes do cadastro para evitar criar uma conta orfa
  // quando a sessao atual nao representa um paciente valido.
  const pacienteId = await fetchCurrentPatientId();
  const caregiverSession = await registerUser(payload);

  try {
    const caregiverResponse = await api.get("/cuidadores/me", {
      headers: {
        Authorization: `Bearer ${caregiverSession.token}`,
      },
    });
    const cuidadorId = asNonEmptyString(
      (caregiverResponse.data as { id?: unknown } | null)?.id
    );

    if (!cuidadorId) {
      throw new Error("Resposta de cuidador inválida: id ausente.");
    }

    await api.post("/vinculos", {
      pacienteId,
      cuidadorId,
      permiteNotificacao: true,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const backendMessage = extractBackendMessage(error.response?.data);

      if (status === 409) {
        throw new FriendlyError(backendMessage ?? "Este cuidador já está vinculado a você.");
      }

      if (status === 400) {
        throw new FriendlyError(backendMessage ?? "Não foi possível vincular o cuidador.");
      }

      if (!status) {
        throw new FriendlyError(
          "O cuidador foi criado, mas a conexão caiu antes de vincular. Tente de novo."
        );
      }

      throw new FriendlyError(
        backendMessage ?? "O cuidador foi criado, mas não foi possível vincular. Tente de novo."
      );
    }

    throw error;
  }
};
