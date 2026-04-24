import { useCallback, useEffect, useState } from "react";
import type { CaregiverProfileResponse } from "../features/profile/types";
import { fetchCaregiverProfileById } from "../services/caregiver-service";
import { useAuthStore } from "../store/auth-store";

type UseCaregiverProfileOptions = {
  enabled?: boolean;
};

type UseCaregiverProfileResult = {
  caregiverProfile: CaregiverProfileResponse | null;
  isLoading: boolean;
  errorMessage: string;
  refreshCaregiverProfile: () => Promise<void>;
};

export function useCaregiverProfile(
  options: UseCaregiverProfileOptions = {}
): UseCaregiverProfileResult {
  const { enabled = true } = options;
  const caregiverId = useAuthStore((state) => state.id);

  const [caregiverProfile, setCaregiverProfile] =
    useState<CaregiverProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const refreshCaregiverProfile = useCallback(async () => {
    if (!enabled) {
      setCaregiverProfile(null);
      setErrorMessage("");
      setIsLoading(false);
      return;
    }

    if (!caregiverId) {
      setCaregiverProfile(null);
      setErrorMessage("Sessao sem ID de cuidador.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const profile = await fetchCaregiverProfileById(caregiverId);
      setCaregiverProfile(profile);
    } catch (error) {
      setCaregiverProfile(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar o perfil do cuidador."
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, caregiverId]);

  useEffect(() => {
    void refreshCaregiverProfile();
  }, [refreshCaregiverProfile]);

  return {
    caregiverProfile,
    isLoading,
    errorMessage,
    refreshCaregiverProfile,
  };
}
