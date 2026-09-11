import { create } from "zustand";
import type {
  CelebrationEvent,
  ConclusaoResponse,
  Conquista,
  ConquistaPaciente,
  Nivel,
} from "../features/gamification/types";
import { isNivelAtOrAhead } from "../features/gamification/utils/level";
import type { PatientProfileResponse } from "../features/profile/types";

type GamificationState = {
  pacienteId: string | null;
  nivel: Nivel | null;
  xpTotal: number | null;
  moedas: number;
  catalogo: Conquista[];
  /** conquistaId -> dataConquista */
  desbloqueadas: Record<string, string | null>;
  hasLoadedAchievements: boolean;
  isLoading: boolean;
  errorMessage: string;
  celebrationQueue: CelebrationEvent[];
  bindPaciente: (pacienteId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (errorMessage: string) => void;
  hydrateFromProfile: (profile: PatientProfileResponse) => void;
  applyConclusao: (conclusao: ConclusaoResponse) => void;
  setCatalogo: (catalogo: Conquista[]) => void;
  mergeUnlocked: (conquistas: ConquistaPaciente[]) => number;
  /** Remove o evento da frente, apenas se ainda for `id` (timers atrasados nao removem outro). */
  dequeueCelebration: (id: string) => void;
  reset: () => void;
};

let eventSequence = 0;
const nextEventId = () => `${Date.now()}-${eventSequence++}`;

const initialState = {
  pacienteId: null,
  nivel: null,
  xpTotal: null,
  moedas: 0,
  catalogo: [],
  desbloqueadas: {},
  hasLoadedAchievements: false,
  isLoading: false,
  errorMessage: "",
  celebrationQueue: [],
};

export const useGamificationStore = create<GamificationState>((set, get) => ({
  ...initialState,
  bindPaciente: (pacienteId) => {
    if (get().pacienteId !== pacienteId) {
      set({ ...initialState, pacienteId });
    }
  },
  setLoading: (isLoading) => set({ isLoading }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  hydrateFromProfile: (profile) =>
    set((state) => {
      if (state.pacienteId && state.pacienteId !== profile.id) {
        return state;
      }

      const profileNivel: Nivel = {
        atual: profile.nivel,
        xpNoNivel: profile.xpNoNivel,
        xpParaProximo: profile.xpParaProximo,
      };

      // O auth-service soma o XP por evento Kafka, depois da resposta do mission-service:
      // um perfil lido logo apos a conclusao pode estar atrasado e nao deve fazer a barra voltar.
      const isAhead = isNivelAtOrAhead(profileNivel, state.nivel);

      // A subida de nivel tambem pode chegar so pelo perfil: XP que nao passa pela resposta da
      // conclusao (DIA_COMPLETO do fechamento do dia) ou XP legado que so existe no auth-service.
      const levelUp: CelebrationEvent[] =
        isAhead && state.nivel && profileNivel.atual > state.nivel.atual
          ? [
              {
                id: nextEventId(),
                kind: "levelUp",
                de: state.nivel.atual,
                para: profileNivel.atual,
              },
            ]
          : [];

      return {
        nivel: isAhead ? profileNivel : state.nivel,
        xpTotal:
          state.xpTotal === null ? profile.xpTotal : Math.max(state.xpTotal, profile.xpTotal),
        moedas: profile.moedas,
        celebrationQueue:
          levelUp.length > 0 ? [...state.celebrationQueue, ...levelUp] : state.celebrationQueue,
      };
    }),
  applyConclusao: (conclusao) =>
    set((state) => {
      const nivelAnterior = state.nivel;
      // Sem `nivel` na resposta (API anterior a SPEC-002), o nivel so muda quando o perfil
      // refletir o XP, e `hydrateFromProfile` detecta a subida.
      const nivelNovo =
        conclusao.nivel && isNivelAtOrAhead(conclusao.nivel, nivelAnterior)
          ? conclusao.nivel
          : nivelAnterior;
      const events: CelebrationEvent[] = [
        {
          id: nextEventId(),
          kind: "reward",
          conclusao,
          nivelAnterior,
          nivelAtual: nivelNovo,
        },
      ];

      if (nivelAnterior && nivelNovo && nivelNovo.atual > nivelAnterior.atual) {
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
  setCatalogo: (catalogo) =>
    set({ catalogo: [...catalogo].sort((a, b) => a.requisitoXp - b.requisitoXp) }),
  mergeUnlocked: (conquistas) => {
    const state = get();
    const desbloqueadas = { ...state.desbloqueadas };
    const catalogoPorId = new Map(state.catalogo.map((conquista) => [conquista.id, conquista]));
    const events: CelebrationEvent[] = [];

    conquistas.forEach(({ conquista, dataConquista }) => {
      catalogoPorId.set(conquista.id, conquista);

      if (conquista.id in desbloqueadas) {
        return;
      }

      desbloqueadas[conquista.id] = dataConquista;

      // Na primeira carga as conquistas ja existiam: so celebra o que destravar depois.
      if (state.hasLoadedAchievements) {
        events.push({ id: nextEventId(), kind: "achievement", conquista, dataConquista });
      }
    });

    set({
      desbloqueadas,
      hasLoadedAchievements: true,
      catalogo: Array.from(catalogoPorId.values()).sort((a, b) => a.requisitoXp - b.requisitoXp),
      celebrationQueue: [...state.celebrationQueue, ...events],
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
