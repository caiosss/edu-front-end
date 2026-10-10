import { useCallback, useEffect, useState } from "react";
import type { PeriodoResumo, ResumoProgresso } from "../features/gamification/types";
import { fetchProgressSummary } from "../services/gamification-service";
import { useAuthStore } from "../store/auth-store";
import { useGamificationStore } from "../store/gamification-store";
import { toFriendlyMessage } from "../utils/friendly-error";

type CachedSummary = {
  token: string;
  resumo: ResumoProgresso;
  atualizadoEm: Date;
};

/**
 * Ultimo resumo bom por periodo. Offline, a tela mostra este com a marca "atualizado as HH:MM"
 * (SPEC-007 §5.5) em vez de uma tela em branco.
 */
const cache = new Map<PeriodoResumo, CachedSummary>();

type UseProgressSummaryResult = {
  resumo: ResumoProgresso | null;
  atualizadoEm: Date | null;
  isLoading: boolean;
  errorMessage: string;
  /** Mostrando o ultimo resumo guardado porque a leitura mais recente falhou. */
  isStale: boolean;
  refresh: () => Promise<void>;
};

export function useProgressSummary(
  periodo: PeriodoResumo,
  enabled: boolean
): UseProgressSummaryResult {
  const token = useAuthStore((state) => state.token);
  const cached = token ? cache.get(periodo) : undefined;
  const cachedForSession = cached && cached.token === token ? cached : null;

  const [resumo, setResumo] = useState<ResumoProgresso | null>(cachedForSession?.resumo ?? null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(
    cachedForSession?.atualizadoEm ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled || !token) {
      return;
    }

    const guardado = cache.get(periodo);

    if (guardado && guardado.token === token) {
      setResumo(guardado.resumo);
      setAtualizadoEm(guardado.atualizadoEm);
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const novoResumo = await fetchProgressSummary(periodo);

      if (useAuthStore.getState().token !== token) {
        return;
      }

      const agora = new Date();
      cache.set(periodo, { token, resumo: novoResumo, atualizadoEm: agora });
      setResumo(novoResumo);
      setAtualizadoEm(agora);

      const store = useGamificationStore.getState();
      store.hydrateFromProfile({
        xpTotal: novoResumo.xpTotal,
        nivel: novoResumo.nivel,
        moedas: store.moedas,
        streak: novoResumo.streak,
      });
    } catch (error) {
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível carregar o seu progresso.")
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, periodo, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    resumo,
    atualizadoEm,
    isLoading,
    errorMessage,
    isStale: Boolean(errorMessage && resumo),
    refresh,
  };
}
