import { create } from "zustand";
import type {
  CelebrationEvent,
  ConclusaoResponse,
  Conquista,
  GamificationProfile,
  Nivel,
  Streak,
} from "../features/gamification/types";
import { isNivelAtOrAhead } from "../features/gamification/utils/level";

type GamificationState = {
  /** Sessao dona do estado; trocar de sessao zera tudo. */
  sessionKey: string | null;
  nivel: Nivel | null;
  xpTotal: number | null;
  moedas: number;
  streak: Streak | null;
  conquistas: Conquista[];
  hasLoadedAchievements: boolean;
  isLoading: boolean;
  errorMessage: string;
  celebrationQueue: CelebrationEvent[];
  bindSession: (sessionKey: string) => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (errorMessage: string) => void;
  hydrateFromProfile: (profile: GamificationProfile) => void;
  applyConclusao: (conclusao: ConclusaoResponse) => void;
  /** @returns quantas conquistas foram desbloqueadas desde a leitura anterior */
  setConquistas: (conquistas: Conquista[]) => number;
  /** Remove o evento da frente, apenas se ainda for `id` (timers atrasados nao removem outro). */
  dequeueCelebration: (id: string) => void;
  reset: () => void;
};

let eventSequence = 0;
const nextEventId = () => `${Date.now()}-${eventSequence++}`;

const initialState = {
  sessionKey: null,
  nivel: null,
  xpTotal: null,
  moedas: 0,
  streak: null,
  conquistas: [],
  hasLoadedAchievements: false,
  isLoading: false,
  errorMessage: "",
  celebrationQueue: [],
};

export const useGamificationStore = create<GamificationState>((set, get) => ({
  ...initialState,
  bindSession: (sessionKey) => {
    if (get().sessionKey !== sessionKey) {
      set({ ...initialState, sessionKey });
    }
  },
  setLoading: (isLoading) => set({ isLoading }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  hydrateFromProfile: (profile) =>
    set((state) => {
      // O gamification-service concede por evento, depois da resposta do mission-service:
      // um perfil lido logo apos a conclusao pode estar atrasado e nao deve fazer a barra voltar.
      const isAhead = isNivelAtOrAhead(profile.nivel, state.nivel);

      // A subida de nivel tambem chega so por aqui: XP de jogo e do fechamento do dia nunca
      // passam pela resposta da conclusao.
      const levelUp: CelebrationEvent[] =
        isAhead && state.nivel && profile.nivel.atual > state.nivel.atual
          ? [{ id: nextEventId(), kind: "levelUp", de: state.nivel.atual, para: profile.nivel.atual }]
          : [];

      return {
        nivel: isAhead ? profile.nivel : state.nivel,
        xpTotal:
          state.xpTotal === null ? profile.xpTotal : Math.max(state.xpTotal, profile.xpTotal),
        moedas: profile.moedas,
        streak: profile.streak,
        celebrationQueue:
          levelUp.length > 0 ? [...state.celebrationQueue, ...levelUp] : state.celebrationQueue,
      };
    }),
  applyConclusao: (conclusao) =>
    set((state) => {
      const nivelAnterior = state.nivel;
      const nivelNovo = isNivelAtOrAhead(conclusao.nivel, nivelAnterior)
        ? conclusao.nivel
        : (nivelAnterior ?? conclusao.nivel);
      const events: CelebrationEvent[] = [
        {
          id: nextEventId(),
          kind: "reward",
          conclusao,
          nivelAnterior,
          nivelAtual: nivelNovo,
        },
      ];

      if (nivelAnterior && nivelNovo.atual > nivelAnterior.atual) {
        events.push({
          id: nextEventId(),
          kind: "levelUp",
          de: nivelAnterior.atual,
          para: nivelNovo.atual,
        });
      }

      return {
        nivel: nivelNovo,
        xpTotal: state.xpTotal === null ? null : state.xpTotal + conclusao.recompensa.xp,
        celebrationQueue: [...state.celebrationQueue, ...events],
      };
    }),
  setConquistas: (conquistas) => {
    const state = get();
    const jaDesbloqueadas = new Set(
      state.conquistas
        .filter((conquista) => conquista.desbloqueadaEm !== null)
        .map((conquista) => conquista.codigo)
    );

    // Na primeira leitura as conquistas ja existiam: so celebra o que destravar depois.
    const events: CelebrationEvent[] = state.hasLoadedAchievements
      ? conquistas
          .filter(
            (conquista) =>
              conquista.desbloqueadaEm !== null && !jaDesbloqueadas.has(conquista.codigo)
          )
          .map((conquista) => ({ id: nextEventId(), kind: "achievement", conquista }))
      : [];

    set({
      conquistas,
      hasLoadedAchievements: true,
      celebrationQueue:
        events.length > 0 ? [...state.celebrationQueue, ...events] : state.celebrationQueue,
    });

    return events.length;
  },
  dequeueCelebration: (id) =>
    set((state) =>
      state.celebrationQueue[0]?.id === id
        ? { celebrationQueue: state.celebrationQueue.slice(1) }
        : state
    ),
  reset: () => set(initialState),
}));
