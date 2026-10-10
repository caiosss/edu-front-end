import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;

  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : AxiosHeaders.from(config.headers);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  config.headers = headers;

  return config;
});

/**
 * Os GlobalExceptionHandler dos servicos respondem erros de negocio com o texto puro da
 * excecao (ex.: 409 "Esta dose já foi registrada."). Devolve esse texto quando existir.
 */
export const extractApiErrorMessage = (data: unknown): string | null => {
  if (typeof data === "string") {
    const message = data.trim();
    return message.length > 0 && message.length <= 240 && !message.startsWith("<")
      ? message
      : null;
  }

  if (data && typeof data === "object") {
    const parsedData = data as { mensagem?: unknown; message?: unknown; erro?: unknown };
    const candidate = parsedData.mensagem ?? parsedData.message ?? parsedData.erro;

    return typeof candidate === "string" && candidate.trim().length > 0
      ? candidate.trim()
      : null;
  }

  return null;
};
