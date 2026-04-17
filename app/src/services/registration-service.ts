import { api } from "./api";
import type { RegisterPayload } from "../features/register/types";

const isFakeApiUrl = (baseURL: string | undefined): boolean => {
  if (!baseURL) {
    return true;
  }

  return /example\.com/i.test(baseURL);
};

export const registerUser = async (payload: RegisterPayload): Promise<void> => {
  // Enquanto o backend nao estiver disponivel, evita falha de rede com URL fake.
  if (isFakeApiUrl(api.defaults.baseURL)) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    return;
  }

  await api.post("/auth/register", payload);
};
