import { useCallback, useRef, useState } from "react";
import type { ConclusaoResponse } from "../features/gamification/types";
import type { CompleteMissionPayload } from "../features/home/types";
import {
  CompleteMissionNetworkError,
  completeMission as completeMissionRequest,
} from "../services/missions-service";
import { createIdempotencyKey } from "../utils/idempotency-key";

/**
 * Janela em que uma nova tentativa reaproveita a mesma `Idempotency-Key`. Depois dela, o toque
 * e tratado como acao nova — senao a dose seguinte do mesmo item receberia a resposta antiga.
 */
const RETRY_KEY_TTL_MS = 10 * 60 * 1000;

type PendingIdempotencyKey = {
  key: string;
  createdAt: number;
};

type UseCompleteMissionResult = {
  completingMissionKeys: string[];
  errorMessage: string;
  isCompleting: boolean;
  clearCompleteMissionError: () => void;
  completeMission: (input: CompleteMissionPayload) => Promise<ConclusaoResponse | null>;
};

export function useCompleteMission(): UseCompleteMissionResult {
  const completingMissionKeysRef = useRef<Set<string>>(new Set());
  const idempotencyKeysRef = useRef<Map<string, PendingIdempotencyKey>>(new Map());

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

  const resolveIdempotencyKey = useCallback((missionKey: string) => {
    const pending = idempotencyKeysRef.current.get(missionKey);

    if (pending && Date.now() - pending.createdAt < RETRY_KEY_TTL_MS) {
      return pending.key;
    }

    const key = createIdempotencyKey();
    idempotencyKeysRef.current.set(missionKey, { key, createdAt: Date.now() });
    return key;
  }, []);

  const clearCompleteMissionError = useCallback(() => {
    setErrorMessage("");
  }, []);

  const completeMission = useCallback(
    async (input: CompleteMissionPayload) => {
      const planoMissaoItemId = input.planoMissaoItemId?.trim();
      const prescricaoItemId = input.prescricaoItemId?.trim();
      const missionKey = prescricaoItemId || planoMissaoItemId;

      if (!missionKey) {
        setErrorMessage("ID do item do plano ou da prescricao ausente.");
        return null;
      }

      if (completingMissionKeysRef.current.has(missionKey)) {
        return null;
      }

      setMissionCompleting(missionKey, true);
      setErrorMessage("");

      try {
        const conclusao = await completeMissionRequest(
          { planoMissaoItemId, prescricaoItemId },
          resolveIdempotencyKey(missionKey)
        );
        idempotencyKeysRef.current.delete(missionKey);
        return conclusao;
      } catch (error) {
        // Sem resposta nao da para saber se o backend registrou: a proxima tentativa reenvia a
        // mesma chave e recebe a resposta original, sem duplicar XP (SPEC-001 §5.3).
        if (!(error instanceof CompleteMissionNetworkError)) {
          idempotencyKeysRef.current.delete(missionKey);
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Nao foi possivel concluir a missao."
        );
        return null;
      } finally {
        setMissionCompleting(missionKey, false);
      }
    },
    [resolveIdempotencyKey, setMissionCompleting]
  );

  return {
    completingMissionKeys,
    errorMessage,
    isCompleting: completingMissionKeys.length > 0,
    clearCompleteMissionError,
    completeMission,
  };
}
