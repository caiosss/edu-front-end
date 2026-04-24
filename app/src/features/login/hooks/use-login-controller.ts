import { useCallback, useState } from "react";
import {
  isInvalidCredentialsError,
  loginUser,
} from "../../../services/auth-service";
import { buildLoginPayload } from "../payload";
import type { LoginFeedbackState, LoginFormValues } from "../types";

type LoginController = {
  feedbackState: LoginFeedbackState;
  feedbackMessage: string;
  clearFeedback: () => void;
  submitLogin: (values: LoginFormValues) => Promise<boolean>;
};

export function useLoginController(): LoginController {
  const [feedbackState, setFeedbackState] = useState<LoginFeedbackState>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const clearFeedback = useCallback(() => {
    setFeedbackState("idle");
    setFeedbackMessage("");
  }, []);

  const submitLogin = useCallback(
    async (values: LoginFormValues) => {
      clearFeedback();

      try {
        const payload = buildLoginPayload(values);
        await loginUser(payload);
        setFeedbackState("success");
        setFeedbackMessage("Login realizado com sucesso.");
        return true;
      } catch (error) {
        setFeedbackState("error");

        if (isInvalidCredentialsError(error)) {
          setFeedbackMessage("Credenciais invalidas. Verifique e tente novamente.");
          return false;
        }

        setFeedbackMessage("Nao foi possivel entrar no momento. Tente novamente.");
        return false;
      }
    },
    [clearFeedback]
  );

  return {
    feedbackState,
    feedbackMessage,
    clearFeedback,
    submitLogin,
  };
}
