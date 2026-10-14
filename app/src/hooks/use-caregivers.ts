import { useCallback, useEffect, useState } from "react";
import type { CaregiverLink } from "../features/caregivers/types";
import { fetchPatientCaregivers } from "../services/caregiver-service";
import { hasActiveConsent } from "../services/consent-service";
import { useAuthStore } from "../store/auth-store";
import { ERROR_MESSAGES, toFriendlyMessage } from "../utils/friendly-error";

type UseCaregiversResult = {
  caregivers: CaregiverLink[];
  /** O termo `DELEGACAO_CUIDADOR` esta vigente: sem ele ninguem registra pelo paciente. */
  hasDelegationConsent: boolean;
  isLoading: boolean;
  errorMessage: string;
  refreshCaregivers: () => Promise<void>;
  replaceCaregiver: (caregiver: CaregiverLink) => void;
  setHasDelegationConsent: (value: boolean) => void;
};

/** Os cuidadores do paciente logado (convidados e ativos) e o estado da delegacao. */
export function useCaregivers(): UseCaregiversResult {
  const token = useAuthStore((state) => state.token);

  const [caregivers, setCaregivers] = useState<CaregiverLink[]>([]);
  const [hasDelegationConsent, setHasDelegationConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const refreshCaregivers = useCallback(async () => {
    if (!token) {
      setCaregivers([]);
      setErrorMessage(ERROR_MESSAGES.session);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const [links, delegation] = await Promise.all([
        fetchPatientCaregivers(),
        hasActiveConsent("DELEGACAO_CUIDADOR"),
      ]);
      setCaregivers(links);
      setHasDelegationConsent(delegation);
    } catch (error) {
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível carregar os seus cuidadores.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const replaceCaregiver = useCallback((caregiver: CaregiverLink) => {
    setCaregivers((current) =>
      current.some((item) => item.id === caregiver.id)
        ? current.map((item) => (item.id === caregiver.id ? caregiver : item))
        : [...current, caregiver]
    );
  }, []);

  useEffect(() => {
    void refreshCaregivers();
  }, [refreshCaregivers]);

  return {
    caregivers,
    hasDelegationConsent,
    isLoading,
    errorMessage,
    refreshCaregivers,
    replaceCaregiver,
    setHasDelegationConsent,
  };
}
