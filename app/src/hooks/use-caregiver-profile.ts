import { useCallback, useEffect, useState } from "react";
import type { CaregiverProfileResponse } from "../features/profile/types";
import { fetchCurrentCaregiverProfile } from "../services/caregiver-service";
import { useAuthStore } from "../store/auth-store";
import { ERROR_MESSAGES, toFriendlyMessage } from "../utils/friendly-error";

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
  const token = useAuthStore((state) => state.token);

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

    if (!token) {
      setCaregiverProfile(null);
      setErrorMessage(ERROR_MESSAGES.session);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const profile = await fetchCurrentCaregiverProfile();
      setCaregiverProfile(profile);
    } catch (error) {
      setCaregiverProfile(null);
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível carregar o perfil do cuidador.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, token]);

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
