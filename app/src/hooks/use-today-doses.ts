import { useCallback, useEffect, useState } from "react";
import type { DoseRegistrada } from "../features/home/types";
import { contestDose, fetchTodayDoses } from "../services/missions-service";
import { useAuthStore } from "../store/auth-store";
import { toFriendlyMessage } from "../utils/friendly-error";

type UseTodayDosesOptions = {
  enabled?: boolean;
};

type UseTodayDosesResult = {
  doses: DoseRegistrada[];
  contestingIds: string[];
  errorMessage: string;
  refreshTodayDoses: () => Promise<void>;
  contest: (historicoId: string) => Promise<boolean>;
};

/** Doses registradas hoje e a contestacao das que o cuidador registrou (SPEC-014 §5.5). */
export function useTodayDoses(options: UseTodayDosesOptions = {}): UseTodayDosesResult {
  const { enabled = true } = options;
  const token = useAuthStore((state) => state.token);

  const [doses, setDoses] = useState<DoseRegistrada[]>([]);
  const [contestingIds, setContestingIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const refreshTodayDoses = useCallback(async () => {
    if (!enabled || !token) {
      setDoses([]);
      return;
    }

    try {
      setDoses(await fetchTodayDoses());
    } catch {
      // Lista de apoio: sem ela a Home segue normal, so nao mostra o que o cuidador registrou.
      setDoses([]);
    }
  }, [enabled, token]);

  const contest = useCallback(async (historicoId: string) => {
    setContestingIds((current) => [...current, historicoId]);
    setErrorMessage("");

    try {
      const updatedDose = await contestDose(historicoId);
      setDoses((current) =>
        current.map((dose) => (dose.id === updatedDose.id ? updatedDose : dose))
      );
      return true;
    } catch (error) {
      setErrorMessage(toFriendlyMessage(error, "Não foi possível corrigir esta dose agora."));
      return false;
    } finally {
      setContestingIds((current) => current.filter((id) => id !== historicoId));
    }
  }, []);

  useEffect(() => {
    void refreshTodayDoses();
  }, [refreshTodayDoses]);

  return { doses, contestingIds, errorMessage, refreshTodayDoses, contest };
}
