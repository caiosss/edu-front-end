export type JwtPayload = {
  role?: string;
  roles?: string[];
  sub?: string;
  email?: string;
  preferred_username?: string;
  username?: string;
  nome?: string;
  name?: string;
  userId?: string;
  userType?: string;
  pacienteId?: string;
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

export const decodeTokenPayload = (token: string | null): JwtPayload | null => {
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

/**
 * Claim `pacienteId` emitida pelo auth-service (SPEC-003 §5.1). Presente apenas quando o
 * usuario autenticado e PACIENTE.
 */
export const getPacienteIdFromToken = (token: string | null): string | null => {
  const pacienteId = decodeTokenPayload(token)?.pacienteId;

  return typeof pacienteId === "string" && pacienteId.trim().length > 0 ? pacienteId : null;
};
