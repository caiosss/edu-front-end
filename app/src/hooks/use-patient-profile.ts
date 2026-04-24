import { useCallback, useEffect, useState } from "react";
import type { PatientProfileResponse } from "../features/profile/types";
import { useAuthStore } from "../store/auth-store";
import { fetchPatientProfileById } from "../services/patient-service";

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
  const patientId = useAuthStore((state) => state.id);

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

    if (!patientId) {
      setPatientProfile(null);
      setErrorMessage("Sessao sem ID de paciente.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const profile = await fetchPatientProfileById(patientId);
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
  }, [enabled, patientId]);

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
