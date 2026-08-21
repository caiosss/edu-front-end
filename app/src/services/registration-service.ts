import axios from "axios";
import type { LoginResult } from "../features/login/types";
import type { RegisterPayload } from "../features/register/types";
import { api } from "./api";
import { fetchCurrentPatientId } from "./patient-service";

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
    throw new Error("Resposta de cadastro invalida.");
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
    throw new Error("Resposta de cadastro invalida.");
  }

  return { id, tipoUsuario, token };
};

export const registerUser = async (payload: RegisterPayload): Promise<LoginResult> => {
  if (!api.defaults.baseURL) {
    throw new Error(
      "URL da API nao configurada. Defina EXPO_PUBLIC_API_URL no .env e reinicie o app."
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

export const registerCaregiverAndCreateLink = async (
  payload: RegisterPayload
): Promise<void> => {
  if (payload.tipoUsuario !== "CUIDADOR") {
    throw new Error("Tipo de usuario invalido para cadastrar cuidador.");
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
      throw new Error("Resposta de cuidador invalida: id ausente.");
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
        throw new Error(backendMessage ?? "O vinculo com este cuidador ja existe.");
      }

      if (status === 400) {
        throw new Error(backendMessage ?? "Nao foi possivel criar o vinculo.");
      }

      if (!status) {
        throw new Error("Cuidador criado, mas nao foi possivel conectar para criar o vinculo.");
      }

      throw new Error(
        backendMessage ??
          `Cuidador criado, mas o vinculo falhou (HTTP ${status}).`
      );
    }

    throw error;
  }
};
