import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/auth-store";

const API_URL = process.env.API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? "";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;

  if (!token) {
    return config;
  }

  const authorizationValue = `Bearer ${token}`;

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", authorizationValue);
    return config;
  }

  const headers = AxiosHeaders.from(config.headers);
  headers.set("Authorization", authorizationValue);
  config.headers = headers;

  return config;
});
