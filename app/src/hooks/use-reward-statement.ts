import { useCallback, useEffect, useRef, useState } from "react";
import type { ExtratoLinha } from "../features/gamification/types";
import { fetchRewardStatement } from "../services/gamification-service";

type UseRewardStatementResult = {
  linhas: ExtratoLinha[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  errorMessage: string;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

/** `GET /gamification/extrato`, pagina por pagina. */
export function useRewardStatement(enabled: boolean): UseRewardStatementResult {
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
      const pagina = await fetchRewardStatement(0);

      if (requestId !== requestRef.current) {
        return;
      }

      setLinhas(pagina.linhas);
      setHasMore(!pagina.ultimaPagina);
      nextPageRef.current = pagina.pagina + 1;
    } catch (error) {
      if (requestId === requestRef.current) {
        setErrorMessage(
          error instanceof Error ? error.message : "Nao foi possivel carregar o extrato."
        );
      }
    } finally {
      if (requestId === requestRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  const loadMore = useCallback(async () => {
    if (!enabled || isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const requestId = requestRef.current;
    setIsLoadingMore(true);

    try {
      const pagina = await fetchRewardStatement(nextPageRef.current);

      if (requestId !== requestRef.current) {
        return;
      }

      setLinhas((atuais) => [...atuais, ...pagina.linhas]);
      setHasMore(!pagina.ultimaPagina);
      nextPageRef.current = pagina.pagina + 1;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel carregar o extrato."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [enabled, hasMore, isLoading, isLoadingMore]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { linhas, isLoading, isLoadingMore, hasMore, errorMessage, refresh, loadMore };
}
