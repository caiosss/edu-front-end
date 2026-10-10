import { useMemo } from "react";
import { useAuthStore } from "../store/auth-store";
import { decodeTokenPayload, type JwtPayload } from "../utils/jwt";

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const asEmailString = (value: unknown): string | null => {
  const stringValue = asNonEmptyString(value);

  if (!stringValue || !stringValue.includes("@")) {
    return null;
  }

  return stringValue;
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
    email:
      asEmailString(payload?.email) ??
      asEmailString(payload?.sub) ??
      asEmailString(payload?.preferred_username) ??
      asEmailString(payload?.username),
    nome: asNonEmptyString(payload?.nome ?? payload?.name),
    payload,
    setToken,
    clearToken,
  };
}
