import { useCallback, useRef, useState } from "react";
import { completeMission as completeMissionRequest } from "../services/missions-service";
import { useAuth } from "./useAuth";

type UseCompleteMissionResult = {
  completingMissionIds: string[];
  errorMessage: string;
  isCompleting: boolean;
  clearCompleteMissionError: () => void;
  completeMission: (missaoId: string) => Promise<boolean>;
};

export function useCompleteMission(): UseCompleteMissionResult {
  const { email } = useAuth();
  const completingMissionIdsRef = useRef<Set<string>>(new Set());

  const [completingMissionIds, setCompletingMissionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const setMissionCompleting = useCallback((missaoId: string, isCompleting: boolean) => {
    const nextCompletingMissionIds = new Set(completingMissionIdsRef.current);

    if (isCompleting) {
      nextCompletingMissionIds.add(missaoId);
    } else {
      nextCompletingMissionIds.delete(missaoId);
    }

    completingMissionIdsRef.current = nextCompletingMissionIds;
    setCompletingMissionIds(Array.from(nextCompletingMissionIds));
  }, []);

  const clearCompleteMissionError = useCallback(() => {
    setErrorMessage("");
  }, []);

  const completeMission = useCallback(
    async (missaoId: string) => {
      const normalizedMissionId = missaoId.trim();
      const pacienteEmail = email?.trim().toLowerCase();

      if (!normalizedMissionId) {
        setErrorMessage("ID da missao ausente.");
        return false;
      }

      if (!pacienteEmail) {
        setErrorMessage("Email do paciente ausente na sessao.");
        return false;
      }

      if (completingMissionIdsRef.current.has(normalizedMissionId)) {
        return false;
      }

      setMissionCompleting(normalizedMissionId, true);
      setErrorMessage("");

      try {
        await completeMissionRequest({
          missaoId: normalizedMissionId,
          pacienteEmail,
        });
        return true;
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Nao foi possivel concluir a missao."
        );
        return false;
      } finally {
        setMissionCompleting(normalizedMissionId, false);
      }
    },
    [email, setMissionCompleting]
  );

  return {
    completingMissionIds,
    errorMessage,
    isCompleting: completingMissionIds.length > 0,
    clearCompleteMissionError,
    completeMission,
  };
}
