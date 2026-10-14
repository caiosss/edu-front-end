import { useCallback, useEffect, useState } from "react";
import type { MyMissionsResponse } from "../features/home/types";
import { fetchMyMissions, fetchPatientMissions } from "../services/missions-service";
import { useAuthStore } from "../store/auth-store";
import { ERROR_MESSAGES, toFriendlyMessage } from "../utils/friendly-error";

type UseHomeMissionsOptions = {
  enabled?: boolean;
  /** Paciente sobre o qual o cuidador age. Sem ele, as missoes sao as do proprio paciente. */
  pacienteId?: string | null;
};

type UseHomeMissionsResult = {
  missions: MyMissionsResponse | null;
  isLoading: boolean;
  errorMessage: string;
  refreshHomeMissions: () => Promise<void>;
};

export function useHomeMissions(
  options: UseHomeMissionsOptions = {}
): UseHomeMissionsResult {
  const { enabled = true, pacienteId = null } = options;
  const token = useAuthStore((state) => state.token);

  const [missions, setMissions] = useState<MyMissionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const refreshHomeMissions = useCallback(async () => {
    if (!enabled) {
      setMissions(null);
      setErrorMessage("");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setMissions(null);
      setErrorMessage(ERROR_MESSAGES.session);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const myMissions = pacienteId
        ? await fetchPatientMissions(pacienteId)
        : await fetchMyMissions();
      setMissions(myMissions);
    } catch (error) {
      setMissions(null);
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível carregar seus medicamentos e missões.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, pacienteId, token]);

  useEffect(() => {
    void refreshHomeMissions();
  }, [refreshHomeMissions]);

  return {
    missions,
    isLoading,
    errorMessage,
    refreshHomeMissions,
  };
}
