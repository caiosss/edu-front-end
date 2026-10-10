import { useCallback, useEffect, useState } from "react";
import type { PatientProfileResponse } from "../features/profile/types";
import { useAuthStore } from "../store/auth-store";
import { fetchCurrentPatientProfile } from "../services/patient-service";
import { ERROR_MESSAGES, toFriendlyMessage } from "../utils/friendly-error";

type UsePatientProfileOptions = {
  enabled?: boolean;
};

type UsePatientProfileResult = {
  patientProfile: PatientProfileResponse | null;
  isLoading: boolean;
  errorMessage: string;
  refreshPatientProfile: () => Promise<void>;
};

export function usePatientProfile(
  options: UsePatientProfileOptions = {}
): UsePatientProfileResult {
  const { enabled = true } = options;
  const token = useAuthStore((state) => state.token);

  const [patientProfile, setPatientProfile] = useState<PatientProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const refreshPatientProfile = useCallback(async () => {
    if (!enabled) {
      setPatientProfile(null);
      setErrorMessage("");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setPatientProfile(null);
      setErrorMessage(ERROR_MESSAGES.session);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const profile = await fetchCurrentPatientProfile();
      setPatientProfile(profile);
    } catch (error) {
      setPatientProfile(null);
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível carregar o seu perfil.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, token]);

  useEffect(() => {
    void refreshPatientProfile();
  }, [refreshPatientProfile]);

  return {
    patientProfile,
    isLoading,
    errorMessage,
    refreshPatientProfile,
  };
}
