import type { LoginFormValues, LoginPayload } from "./types";

export const buildLoginPayload = (values: LoginFormValues): LoginPayload => ({
  email: values.email.trim().toLowerCase(),
  senha: values.senha,
});
