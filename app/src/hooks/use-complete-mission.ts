import { useCallback, useRef, useState } from "react";
import { completeMission as completeMissionRequest } from "../services/missions-service";
import { useAuth } from "./useAuth";

type CompleteMissionInput = {
  missaoId?: string;
  prescricaoId?: string;
};

type UseCompleteMissionResult = {
  completingMissionKeys: string[];
  errorMessage: string;
  isCompleting: boolean;
  clearCompleteMissionError: () => void;
  completeMission: (input: CompleteMissionInput) => Promise<string | null>;
};

export function useCompleteMission(): UseCompleteMissionResult {
  const { email } = useAuth();
  const completingMissionKeysRef = useRef<Set<string>>(new Set());

  const [completingMissionKeys, setCompletingMissionKeys] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const setMissionCompleting = useCallback((missionKey: string, isCompleting: boolean) => {
    const nextCompletingMissionKeys = new Set(completingMissionKeysRef.current);

    if (isCompleting) {
      nextCompletingMissionKeys.add(missionKey);
    } else {
      nextCompletingMissionKeys.delete(missionKey);
    }

    completingMissionKeysRef.current = nextCompletingMissionKeys;
    setCompletingMissionKeys(Array.from(nextCompletingMissionKeys));
  }, []);

  const clearCompleteMissionError = useCallback(() => {
    setErrorMessage("");
  }, []);

  const completeMission = useCallback(
    async (input: CompleteMissionInput) => {
      const normalizedMissionId = input.missaoId?.trim();
      const normalizedPrescriptionId = input.prescricaoId?.trim();
      const missionKey = normalizedPrescriptionId || normalizedMissionId;
      const pacienteEmail = email?.trim().toLowerCase();

      if (!missionKey) {
        setErrorMessage("ID da missao ou prescricao ausente.");
        return null;
      }

      if (!pacienteEmail) {
        setErrorMessage("Email do paciente ausente na sessao.");
        return null;
      }

      if (completingMissionKeysRef.current.has(missionKey)) {
        return null;
      }

      setMissionCompleting(missionKey, true);
      setErrorMessage("");

      try {
        return await completeMissionRequest({
          missaoId: normalizedMissionId,
          prescricaoId: normalizedPrescriptionId,
          pacienteEmail,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Nao foi possivel concluir a missao."
        );
        return null;
      } finally {
        setMissionCompleting(missionKey, false);
      }
    },
    [email, setMissionCompleting]
  );

  return {
    completingMissionKeys,
    errorMessage,
    isCompleting: completingMissionKeys.length > 0,
    clearCompleteMissionError,
    completeMission,
  };
}
