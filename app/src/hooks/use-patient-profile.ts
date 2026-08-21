import { useCallback, useEffect, useState } from "react";
import type { PatientProfileResponse } from "../features/profile/types";
import { useAuthStore } from "../store/auth-store";
import { fetchCurrentPatientProfile } from "../services/patient-service";

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
      setErrorMessage("Sessao nao autenticada para carregar o paciente.");
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
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar o perfil do paciente."
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
