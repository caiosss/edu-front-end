export type LoginFormValues = {
  email: string;
  senha: string;
};

export const loginDefaultValues: LoginFormValues = {
  email: "",
  senha: "",
};

export type LoginPayload = {
  email: string;
  senha: string;
};

export type LoginResult = {
  token: string;
  id: string;
  tipoUsuario: string;
};

export type LoginFeedbackState = "idle" | "success" | "error";
