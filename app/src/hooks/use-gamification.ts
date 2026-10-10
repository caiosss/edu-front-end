import { useEffect, useMemo } from "react";
import {
  fetchGamificationAchievements,
  fetchGamificationProfile,
} from "../services/gamification-service";
import { useAuthStore } from "../store/auth-store";
import { useGamificationStore } from "../store/gamification-store";
import { getPacienteIdFromToken } from "../utils/jwt";
import { toFriendlyMessage } from "../utils/friendly-error";

/**
 * O gamification-service concede XP e conquistas ao consumir os eventos de dominio (outbox ->
 * Kafka), depois da resposta da conclusao. Le de novo algumas vezes para trazer o que chegou.
 */
const SYNC_DELAYS_MS = [1500, 4000, 9000];

let syncTimers: ReturnType<typeof setTimeout>[] = [];
let loadPromise: Promise<void> | null = null;
/** Token para o qual a gamificacao ja foi carregada: evita recarregar a cada tela montada. */
let loadedToken: string | null = null;

/** As rotas `/gamification/*` so atendem paciente; o alvo e sempre o do token. */
export const isPatientSession = (token: string | null, tipoUsuario: string | null) =>
  Boolean(token) &&
  (Boolean(getPacienteIdFromToken(token)) || tipoUsuario?.toUpperCase() === "PACIENTE");

const errorMessageOf = (error: unknown) =>
  toFriendlyMessage(error, "Não foi possível carregar o seu progresso.");

export const cancelGamificationSync = () => {
  syncTimers.forEach(clearTimeout);
  syncTimers = [];
};

export const loadGamification = (): Promise<void> => {
  const { token, tipoUsuario } = useAuthStore.getState();

  if (!token || !isPatientSession(token, tipoUsuario)) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadedToken = token;
  const store = useGamificationStore.getState();
  store.bindSession(token);
  store.setLoading(true);
  store.setErrorMessage("");

  loadPromise = (async () => {
    const [perfil, conquistas] = await Promise.allSettled([
      fetchGamificationProfile(),
      fetchGamificationAchievements(),
    ]);

    // A sessao pode ter mudado enquanto as requisicoes voltavam.
    if (useAuthStore.getState().token !== token) {
      return;
    }

    const state = useGamificationStore.getState();

    if (perfil.status === "fulfilled") {
      state.hydrateFromProfile(perfil.value);
    }

    if (conquistas.status === "fulfilled") {
      state.setConquistas(conquistas.value);
    }

    const failure = [perfil, conquistas].find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    state.setErrorMessage(failure ? errorMessageOf(failure.reason) : "");
  })().finally(() => {
    loadPromise = null;
    useGamificationStore.getState().setLoading(false);
  });

  return loadPromise;
};

/** Depois de uma acao que rende XP (conclusao ou rodada de jogo). */
export const syncGamificationAfterReward = () => {
  const token = useAuthStore.getState().token;
  cancelGamificationSync();

  if (!token) {
    return;
  }

  syncTimers = SYNC_DELAYS_MS.map((delay) =>
    setTimeout(async () => {
      if (useAuthStore.getState().token !== token) {
        return;
      }

      const [perfil, conquistas] = await Promise.allSettled([
        fetchGamificationProfile(),
        fetchGamificationAchievements(),
      ]);

      if (useAuthStore.getState().token !== token) {
        return;
      }

      const state = useGamificationStore.getState();

      if (perfil.status === "fulfilled") {
        state.hydrateFromProfile(perfil.value);
      }

      if (conquistas.status === "fulfilled") {
        state.setConquistas(conquistas.value);
      }
    }, delay)
  );
};

export function useGamification() {
  const token = useAuthStore((state) => state.token);
  const tipoUsuario = useAuthStore((state) => state.tipoUsuario);
  const isPatient = useMemo(() => isPatientSession(token, tipoUsuario), [token, tipoUsuario]);

  const nivel = useGamificationStore((state) => state.nivel);
  const xpTotal = useGamificationStore((state) => state.xpTotal);
  const moedas = useGamificationStore((state) => state.moedas);
  const streak = useGamificationStore((state) => state.streak);
  const conquistas = useGamificationStore((state) => state.conquistas);
  const isLoading = useGamificationStore((state) => state.isLoading);
  const errorMessage = useGamificationStore((state) => state.errorMessage);

  useEffect(() => {
    if (!isPatient) {
      cancelGamificationSync();
      return;
    }

    if (loadedToken !== token) {
      void loadGamification();
    }
  }, [isPatient, token]);

  return {
    isPatient,
    nivel,
    xpTotal,
    moedas,
    streak,
    conquistas,
    isLoading,
    errorMessage,
    refreshGamification: loadGamification,
  };
}
