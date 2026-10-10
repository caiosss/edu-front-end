import { useCallback, useEffect, useState } from "react";
import type { RodadaResumo, SituacaoJogo } from "../features/games/types";
import { fetchAvailableGames, fetchRoundHistory } from "../services/games-service";
import { toFriendlyMessage } from "../utils/friendly-error";

type UseGamesLobbyResult = {
  jogos: SituacaoJogo[];
  historico: RodadaResumo[];
  isLoading: boolean;
  errorMessage: string;
  refresh: () => Promise<void>;
};

/** `GET /jogos/disponiveis` e `GET /jogos/rodadas`, para a tela de entrada dos jogos. */
export function useGamesLobby(enabled: boolean): UseGamesLobbyResult {
  const [jogos, setJogos] = useState<SituacaoJogo[]>([]);
  const [historico, setHistorico] = useState<RodadaResumo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const [disponiveis, rodadas] = await Promise.allSettled([
      fetchAvailableGames(),
      fetchRoundHistory(5),
    ]);

    if (disponiveis.status === "fulfilled") {
      setJogos(disponiveis.value);
    } else {
      setErrorMessage(
        toFriendlyMessage(disponiveis.reason, "Não foi possível carregar os jogos.")
      );
    }

    if (rodadas.status === "fulfilled") {
      setHistorico(rodadas.value);
    }

    setIsLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { jogos, historico, isLoading, errorMessage, refresh };
}
