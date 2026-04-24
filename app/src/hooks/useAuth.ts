import { useMemo } from "react";
import { useAuthStore } from "../store/auth-store";

type JwtPayload = {
  role?: string;
  roles?: string[];
  email?: string;
  nome?: string;
  name?: string;
  [key: string]: unknown;
};

const decodeBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  if (typeof globalThis.atob !== "function") {
    throw new Error("No base64 decoder available in this environment.");
  }

  const decoded = globalThis.atob(padded);
  const encoded = Array.from(decoded)
    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
    .join("");

  return decodeURIComponent(encoded);
};

const decodeTokenPayload = (token: string | null): JwtPayload | null => {
  if (!token) {
    return null;
  }

  const tokenParts = token.split(".");

  if (tokenParts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(tokenParts[1])) as JwtPayload;
  } catch {
    return null;
  }
};

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const extractRole = (payload: JwtPayload | null): string | null => {
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload.roles)) {
    return asNonEmptyString(payload.roles[0]);
  }

  return asNonEmptyString(payload.role);
};

export function useAuth() {
  const token = useAuthStore((state) => state.token);
  const id = useAuthStore((state) => state.id);
  const tipoUsuario = useAuthStore((state) => state.tipoUsuario);
  const setToken = useAuthStore((state) => state.setToken);
  const clearToken = useAuthStore((state) => state.clearToken);

  const payload = useMemo(() => decodeTokenPayload(token), [token]);

  return {
    token,
    id,
    tipoUsuario,
    isAuthenticated: Boolean(token),
    role: extractRole(payload),
    email: asNonEmptyString(payload?.email),
    nome: asNonEmptyString(payload?.nome ?? payload?.name),
    payload,
    setToken,
    clearToken,
  };
}
