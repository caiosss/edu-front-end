import { useCallback, useEffect, useState } from "react";
import type { MyMissionsResponse } from "../features/home/types";
import { fetchMyMissions } from "../services/missions-service";
import { useAuthStore } from "../store/auth-store";

type UseHomeMissionsOptions = {
  enabled?: boolean;
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
  const { enabled = true } = options;
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
      setErrorMessage("Sessao sem token para carregar missoes.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const myMissions = await fetchMyMissions();
      setMissions(myMissions);
    } catch (error) {
      setMissions(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar as missoes da tela inicial."
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, token]);

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
