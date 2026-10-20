import { useCallback, useEffect, useState } from "react";
import type { Conquista } from "../features/gamification/types";
import type { RodadaResumo } from "../features/games/types";
import { fetchGamificationAchievements } from "../services/gamification-service";
import { fetchRoundHistory } from "../services/games-service";
import { toFriendlyMessage } from "../utils/friendly-error";
import { useAuth } from "./useAuth";
import { useCaregiverProfile } from "./use-caregiver-profile";

export const firstName = (nome: string | null | undefined): string | null =>
  nome?.trim().split(/\s+/)[0] || null;

type CaregiverPatient = {
  isCaregiver: boolean;
  isLoading: boolean;
  errorMessage: string;
  /** Paciente de vinculo ATIVO; o `pacienteId` nao vai no token do cuidador (SPEC-014 §5.7). */
  pacienteId: string | null;
  pacienteNome: string | null;
  /** O paciente liberou VER_PROGRESSO para este cuidador. */
  podeVerProgresso: boolean;
  /** Texto para quando nao ha o que mostrar: sem vinculo ou sem a permissao. */
  mensagemSemAcesso: string | null;
  refresh: () => Promise<void>;
};

/** O paciente sobre quem o cuidador olha o progresso e os jogos. */
export function useCaregiverPatient(): CaregiverPatient {
  const { tipoUsuario } = useAuth();
  const isCaregiver = tipoUsuario === "CUIDADOR";
  const { caregiverProfile, isLoading, errorMessage, refreshCaregiverProfile } =
    useCaregiverProfile({ enabled: isCaregiver });

  const pacienteId =
    caregiverProfile?.status === "ATIVO" ? caregiverProfile.pacienteId ?? null : null;
  const pacienteNome = firstName(caregiverProfile?.pacienteNome);
  const podeVerProgresso =
    Boolean(pacienteId) && (caregiverProfile?.escopos ?? []).includes("VER_PROGRESSO");

  let mensagemSemAcesso: string | null = null;
  if (isCaregiver && caregiverProfile && !podeVerProgresso) {
    mensagemSemAcesso = pacienteId
      ? `${pacienteNome ?? "O paciente"} ainda não liberou para você ver o progresso. Peça para liberar "Ver meu progresso" em "Meus cuidadores", no perfil do app.`
      : "Você ainda não acompanha nenhum paciente. Peça um convite à pessoa que você cuida.";
  }

  return {
    isCaregiver,
    isLoading,
    errorMessage,
    pacienteId: podeVerProgresso ? pacienteId : null,
    pacienteNome,
    podeVerProgresso,
    mensagemSemAcesso,
    refresh: refreshCaregiverProfile,
  };
}

/** Conquistas do paciente acompanhado (`/gamification/pacientes/{id}/conquistas`). */
export function usePatientAchievements(pacienteId: string | null) {
  const [conquistas, setConquistas] = useState<Conquista[]>([]);

  const refresh = useCallback(async () => {
    if (!pacienteId) {
      setConquistas([]);
      return;
    }
    try {
      setConquistas(await fetchGamificationAchievements(pacienteId));
    } catch {
      // O resumo ja traz as conquistas recentes; a lista completa e complemento.
    }
  }, [pacienteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { conquistas, refresh };
}

/** Rodadas que o paciente acompanhado jogou. So leitura: o cuidador nao joga por ele. */
export function usePatientGameHistory(pacienteId: string | null) {
  const [historico, setHistorico] = useState<RodadaResumo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!pacienteId) {
      setHistorico([]);
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      setHistorico(await fetchRoundHistory(20, pacienteId));
    } catch (error) {
      setErrorMessage(toFriendlyMessage(error, "Não foi possível carregar os jogos agora."));
    } finally {
      setIsLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { historico, isLoading, errorMessage, refresh };
}
