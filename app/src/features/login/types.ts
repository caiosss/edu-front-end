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
  password: string;
};

export type LoginResult = {
  token: string;
  refreshToken?: string | null;
};

export type LoginFeedbackState = "idle" | "success" | "error";
