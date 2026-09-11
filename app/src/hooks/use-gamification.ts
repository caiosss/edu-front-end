import { useEffect, useMemo } from "react";
import type { PatientProfileResponse } from "../features/profile/types";
import {
  fetchAchievementCatalog,
  fetchPatientAchievements,
} from "../services/achievements-service";
import { fetchCurrentPatientProfile } from "../services/patient-service";
import { useAuthStore } from "../store/auth-store";
import { useGamificationStore } from "../store/gamification-store";
import { getPacienteIdFromToken } from "../utils/jwt";

/**
 * A conquista destrava de forma assincrona (mission-service -> xp-events -> achievement-service),
 * entao a resposta da conclusao ainda nao a traz. Consulta algumas vezes e para ao achar novidade.
 */
const ACHIEVEMENT_SYNC_DELAYS_MS = [1500, 4000, 9000];

let syncTimers: ReturnType<typeof setTimeout>[] = [];
let loadPromise: Promise<void> | null = null;
/** Token para o qual a gamificacao ja foi carregada: evita recarregar a cada tela montada. */
let loadedToken: string | null = null;

/**
 * Sessao de paciente. O token so traz `pacienteId` desde a SPEC-003; com a API anterior, o tipo
 * vem da resposta do login e o id, do perfil.
 */
const isPatientSession = (token: string | null, tipoUsuario: string | null) =>
  Boolean(token) &&
  (Boolean(getPacienteIdFromToken(token)) || tipoUsuario?.toUpperCase() === "PACIENTE");

const errorMessageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Nao foi possivel carregar seu progresso.";

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
  useGamificationStore.getState().setLoading(true);
  useGamificationStore.getState().setErrorMessage("");

  loadPromise = (async () => {
    let failure: unknown = null;
    let profile: PatientProfileResponse | null = null;

    try {
      profile = await fetchCurrentPatientProfile();
    } catch (error) {
      failure = error;
    }

    // A sessao pode ter mudado enquanto a requisicao voltava.
    if (useAuthStore.getState().token !== token) {
      return;
    }

    const pacienteId = getPacienteIdFromToken(token) ?? profile?.id ?? null;

    if (!pacienteId) {
      useGamificationStore.getState().setErrorMessage(errorMessageOf(failure));
      return;
    }

    useGamificationStore.getState().bindPaciente(pacienteId);
    useGamificationStore.getState().setLoading(true);

    if (profile) {
      useGamificationStore.getState().hydrateFromProfile(profile);
    }

    const [catalogo, conquistas] = await Promise.allSettled([
      fetchAchievementCatalog(),
      fetchPatientAchievements(pacienteId),
    ]);

    if (useAuthStore.getState().token !== token) {
      return;
    }

    const state = useGamificationStore.getState();

    if (catalogo.status === "fulfilled") {
      state.setCatalogo(catalogo.value);
    } else {
      failure = failure ?? catalogo.reason;
    }

    if (conquistas.status === "fulfilled") {
      state.mergeUnlocked(conquistas.value);
    } else {
      failure = failure ?? conquistas.reason;
    }

    state.setErrorMessage(failure ? errorMessageOf(failure) : "");
  })().finally(() => {
    loadPromise = null;
    useGamificationStore.getState().setLoading(false);
  });

  return loadPromise;
};

export const syncAchievementsAfterReward = () => {
  const token = useAuthStore.getState().token;
  const pacienteId =
    getPacienteIdFromToken(token) ?? useGamificationStore.getState().pacienteId;
  cancelGamificationSync();

  if (!token || !pacienteId) {
    return;
  }

  let hasFoundNewAchievement = false;

  syncTimers = ACHIEVEMENT_SYNC_DELAYS_MS.map((delay) =>
    setTimeout(async () => {
      if (hasFoundNewAchievement || useAuthStore.getState().token !== token) {
        return;
      }

      const [conquistas, profile] = await Promise.allSettled([
        fetchPatientAchievements(pacienteId),
        fetchCurrentPatientProfile(),
      ]);

      if (useAuthStore.getState().token !== token) {
        return;
      }

      const state = useGamificationStore.getState();

      // Na API anterior a SPEC-002 e o perfil que revela o nivel novo.
      if (profile.status === "fulfilled") {
        state.hydrateFromProfile(profile.value);
      }

      if (conquistas.status === "fulfilled" && state.mergeUnlocked(conquistas.value) > 0) {
        hasFoundNewAchievement = true;
        cancelGamificationSync();
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
  const catalogo = useGamificationStore((state) => state.catalogo);
  const desbloqueadas = useGamificationStore((state) => state.desbloqueadas);
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
    catalogo,
    desbloqueadas,
    isLoading,
    errorMessage,
    refreshGamification: loadGamification,
  };
}
