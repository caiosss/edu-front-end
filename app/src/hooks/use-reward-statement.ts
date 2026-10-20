import { useCallback, useEffect, useRef, useState } from "react";
import type { ExtratoLinha } from "../features/gamification/types";
import { fetchRewardStatement } from "../services/gamification-service";
import { toFriendlyMessage } from "../utils/friendly-error";

type UseRewardStatementResult = {
  linhas: ExtratoLinha[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  errorMessage: string;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

/** `GET /gamification/extrato`, pagina por pagina. Com `pacienteId`, o do paciente acompanhado. */
export function useRewardStatement(
  enabled: boolean,
  pacienteId: string | null = null
): UseRewardStatementResult {
  const [linhas, setLinhas] = useState<ExtratoLinha[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const nextPageRef = useRef(0);
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const requestId = ++requestRef.current;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const pagina = await fetchRewardStatement(0, pacienteId);

      if (requestId !== requestRef.current) {
        return;
      }

      setLinhas(pagina.linhas);
      setHasMore(!pagina.ultimaPagina);
      nextPageRef.current = pagina.pagina + 1;
    } catch (error) {
      if (requestId === requestRef.current) {
        setErrorMessage(
          toFriendlyMessage(error, "Não foi possível carregar o histórico de recompensas.")
        );
      }
    } finally {
      if (requestId === requestRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, pacienteId]);

  const loadMore = useCallback(async () => {
    if (!enabled || isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const requestId = requestRef.current;
    setIsLoadingMore(true);

    try {
      const pagina = await fetchRewardStatement(nextPageRef.current, pacienteId);

      if (requestId !== requestRef.current) {
        return;
      }

      setLinhas((atuais) => [...atuais, ...pagina.linhas]);
      setHasMore(!pagina.ultimaPagina);
      nextPageRef.current = pagina.pagina + 1;
    } catch (error) {
      setErrorMessage(
        toFriendlyMessage(error, "Não foi possível carregar o histórico de recompensas.")
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [enabled, hasMore, isLoading, isLoadingMore, pacienteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { linhas, isLoading, isLoadingMore, hasMore, errorMessage, refresh, loadMore };
}
