import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  Bell,
  CircleStar,
  GlassWater,
  Pill,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import { AnimatedXpBar } from "../features/gamification/components/animated-xp-bar";
import { LevelRing } from "../features/gamification/components/level-ring";
import type { ConclusaoResponse, ProgressoDoDia } from "../features/gamification/types";
import { nivelRatio } from "../features/gamification/utils/level";
import type {
  GeneralMissionResponse,
  MedicationMissionResponse,
} from "../features/home/types";
import {
  formatMedicationTimeLabel,
  getMedicationScheduleInfo,
  type MedicationScheduleInfo,
} from "../features/home/utils/medication-schedule";
import ChecklistCard, {
  type ChecklistItem,
} from "../features/navigation/components/check-list-card";
import { useAuth } from "../hooks/useAuth";
import { useCompleteMission } from "../hooks/use-complete-mission";
import { syncAchievementsAfterReward, useGamification } from "../hooks/use-gamification";
import { useHomeMissions } from "../hooks/use-home-missions";
import { useGamificationStore } from "../store/gamification-store";

const DAILY_PROGRESS_GRADIENT = ["#63E6BE", "#20C997", "#2C7BE5"] as const;

const resolveMissionIcon = (categoria: string): LucideIcon => {
  const normalizedCategory = categoria.trim().toUpperCase();

  if (normalizedCategory.includes("MEDIC")) {
    return Pill;
  }

  if (normalizedCategory.includes("HIDR") || normalizedCategory.includes("AGUA")) {
    return GlassWater;
  }

  if (
    normalizedCategory.includes("ATIV") ||
    normalizedCategory.includes("CAMIN") ||
    normalizedCategory.includes("EXERC")
  ) {
    return Star;
  }

  return CircleStar;
};

const mapGeneralMissionToChecklistItem = (
  mission: GeneralMissionResponse
): ChecklistItem => {
  const subtitle = mission.observacao.trim() || mission.descricao.trim();

  return {
    id: mission.id,
    title: mission.nome,
    subtitle: subtitle.length > 0 ? subtitle : undefined,
    icon: resolveMissionIcon(mission.categoria),
  };
};

const mapMedicationMissionToChecklistItem = (
  mission: MedicationMissionResponse,
  scheduleInfo?: MedicationScheduleInfo
): ChecklistItem => {
  const subtitleParts: string[] = [];

  if (mission.dosagem.trim()) {
    subtitleParts.push(mission.dosagem.trim());
  }

  const firstDoseTime =
    scheduleInfo?.scheduledTimeLabel ?? formatMedicationTimeLabel(mission.horarioPrimeiraDose);

  if (firstDoseTime) {
    subtitleParts.push(firstDoseTime);
  }

  if (mission.frequenciaHoras > 0) {
    subtitleParts.push(`a cada ${mission.frequenciaHoras}h`);
  }

  return {
    id: mission.id,
    title: mission.nomeMedicamento,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(" - ") : undefined,
    icon: Pill,
    disabledLabel: scheduleInfo?.disabledLabel,
    notice:
      scheduleInfo?.noticeMessage && scheduleInfo.noticeTone
        ? {
            message: scheduleInfo.noticeMessage,
            tone: scheduleInfo.noticeTone,
          }
        : undefined,
  };
};

export default function HomeScreen() {
  const { role } = useAuth();
  const { missions, isLoading, errorMessage, refreshHomeMissions } = useHomeMissions();
  const {
    completeMission,
    completingMissionKeys,
    errorMessage: completeMissionErrorMessage,
  } = useCompleteMission();
  const { isPatient, nivel, xpTotal } = useGamification();
  const applyConclusao = useGamificationStore((state) => state.applyConclusao);

  const [takenMedicationIds, setTakenMedicationIds] = useState<string[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [doseProgress, setDoseProgress] = useState<ProgressoDoDia | null>(null);
  const [completionErrorSection, setCompletionErrorSection] = useState<
    "medication" | "mission" | null
  >(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const handleConclusao = useCallback(
    (conclusao: ConclusaoResponse) => {
      applyConclusao(conclusao);

      if (conclusao.registro?.progressoDoDia) {
        setDoseProgress(conclusao.registro.progressoDoDia);
      }

      // O estado `concluido` e derivado no backend; a conquista destrava de forma assincrona.
      void refreshHomeMissions();
      syncAchievementsAfterReward();
    },
    [applyConclusao, refreshHomeMissions]
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const medicationScheduleById = useMemo(() => {
    const scheduleById = new Map<string, MedicationScheduleInfo>();

    if (!missions) {
      return scheduleById;
    }

    missions.missoesMedicamento.forEach((mission) => {
      scheduleById.set(
        mission.id,
        getMedicationScheduleInfo(mission.horarioPrimeiraDose, currentDate)
      );
    });

    return scheduleById;
  }, [currentDate, missions]);

  const medicationItems = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesMedicamento
      .filter((mission) => mission.ativo)
      .map((mission) =>
        mapMedicationMissionToChecklistItem(
          mission,
          medicationScheduleById.get(mission.id)
        )
      );
  }, [medicationScheduleById, missions]);

  const dailyMissionItems = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesGerais
      .filter((mission) => mission.ativa)
      .map(mapGeneralMissionToChecklistItem);
  }, [missions]);

  const completedDailyMissionItemIds = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesGerais
      .filter((mission) => mission.ativa && mission.concluida)
      .map((mission) => mission.id);
  }, [missions]);

  const completedMedicationItemIds = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesMedicamento
      .filter((mission) => mission.ativo && mission.concluida)
      .map((mission) => mission.id);
  }, [missions]);

  const completingDailyMissionItemIds = useMemo(() => {
    if (!missions) {
      return [];
    }

    const completingMissionKeySet = new Set(completingMissionKeys);

    return missions.missoesGerais
      .filter((mission) => completingMissionKeySet.has(mission.id))
      .map((mission) => mission.id);
  }, [completingMissionKeys, missions]);

  const completingMedicationItemIds = useMemo(() => {
    if (!missions) {
      return [];
    }

    const completingMissionKeySet = new Set(completingMissionKeys);

    return missions.missoesMedicamento
      .filter((mission) => completingMissionKeySet.has(mission.id))
      .map((mission) => mission.id);
  }, [completingMissionKeys, missions]);

  const blockedMedicationItemIds = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesMedicamento
      .filter(
        (mission) =>
          mission.ativo &&
          !takenMedicationIds.includes(mission.id) &&
          medicationScheduleById.get(mission.id)?.status === "blocked"
      )
      .map((mission) => mission.id);
  }, [medicationScheduleById, missions, takenMedicationIds]);

  const hasOverdueMedication = useMemo(() => {
    if (!missions) {
      return false;
    }

    return missions.missoesMedicamento.some(
      (mission) =>
        mission.ativo &&
        !takenMedicationIds.includes(mission.id) &&
        medicationScheduleById.get(mission.id)?.status === "overdue"
    );
  }, [medicationScheduleById, missions, takenMedicationIds]);

  useEffect(() => {
    const activeMedicationItemIdSet = new Set(
      missions?.missoesMedicamento
        .filter((mission) => mission.ativo)
        .map((mission) => mission.id) ?? []
    );
    const completedMedicationItemIdSet = new Set(completedMedicationItemIds);

    setTakenMedicationIds((currentIds) =>
      Array.from(
        currentIds.reduce((nextIds, id) => {
          if (activeMedicationItemIdSet.has(id)) {
            nextIds.add(id);
          }

          return nextIds;
        }, completedMedicationItemIdSet)
      )
    );
  }, [completedMedicationItemIds, missions]);

  useEffect(() => {
    const activeMissionItemIdSet = new Set(dailyMissionItems.map((item) => item.id));
    const completedMissionItemIdSet = new Set(completedDailyMissionItemIds);

    setCompletedMissionIds((currentIds) =>
      Array.from(
        currentIds.reduce((nextIds, id) => {
          if (activeMissionItemIdSet.has(id)) {
            nextIds.add(id);
          }

          return nextIds;
        }, completedMissionItemIdSet)
      )
    );
  }, [completedDailyMissionItemIds, dailyMissionItems]);

  const toggleMedication = async (itemId: string) => {
    if (
      takenMedicationIds.includes(itemId) ||
      completingMedicationItemIds.includes(itemId)
    ) {
      return;
    }

    const medicationMission = missions?.missoesMedicamento.find(
      (currentMission) => currentMission.id === itemId
    );

    if (!medicationMission) {
      return;
    }

    const scheduleInfo =
      medicationScheduleById.get(medicationMission.id) ??
      getMedicationScheduleInfo(medicationMission.horarioPrimeiraDose, currentDate);

    if (scheduleInfo.isBlocked) {
      return;
    }

    setCompletionErrorSection(null);

    const conclusao = await completeMission({
      prescricaoItemId: medicationMission.id,
    });

    if (conclusao) {
      setTakenMedicationIds((currentIds) =>
        currentIds.includes(itemId) ? currentIds : [...currentIds, itemId]
      );
      setCompletionErrorSection(null);
      handleConclusao(conclusao);
    } else {
      setCompletionErrorSection("medication");
    }
  };

  const toggleMission = async (itemId: string) => {
    if (
      completedMissionIds.includes(itemId) ||
      completingDailyMissionItemIds.includes(itemId)
    ) {
      return;
    }

    const mission = missions?.missoesGerais.find(
      (currentMission) => currentMission.id === itemId
    );

    if (!mission) {
      return;
    }

    setCompletionErrorSection(null);

    const conclusao = await completeMission({
      planoMissaoItemId: mission.id,
    });

    if (conclusao) {
      setCompletedMissionIds((currentIds) =>
        currentIds.includes(itemId) ? currentIds : [...currentIds, itemId]
      );
      setCompletionErrorSection(null);
      handleConclusao(conclusao);
    } else {
      setCompletionErrorSection("mission");
    }
  };

  const dailyProgress = useMemo(() => {
    const total = medicationItems.length + dailyMissionItems.length;
    const done = Math.min(takenMedicationIds.length + completedMissionIds.length, total);

    return {
      total,
      done,
      ratio: total > 0 ? done / total : 0,
      isComplete: total > 0 && done >= total,
    };
  }, [
    completedMissionIds.length,
    dailyMissionItems.length,
    medicationItems.length,
    takenMedicationIds.length,
  ]);

  const welcomeName = role === "Paciente" ? "Paciente" : "Cuidador";

  const medicationDescription = useMemo(() => {
    if (completionErrorSection === "medication" && completeMissionErrorMessage) {
      return completeMissionErrorMessage;
    }

    if (errorMessage) {
      return "Não foi possível carregar os medicamentos de hoje.";
    }

    if (isLoading && !missions) {
      return "Carregando seus medicamentos de hoje...";
    }

    if (hasOverdueMedication) {
      return "Confira os medicamentos em vermelho: o horario ja passou.";
    }

    if (blockedMedicationItemIds.length > 0) {
      return "Alguns medicamentos ainda nao chegaram ao horario de conclusao.";
    }

    return "Acompanhe e marque cada dose no horário certo.";
  }, [
    blockedMedicationItemIds.length,
    completeMissionErrorMessage,
    completionErrorSection,
    errorMessage,
    hasOverdueMedication,
    isLoading,
    missions,
  ]);

  const missionDescription = useMemo(() => {
    if (completionErrorSection === "mission" && completeMissionErrorMessage) {
      return completeMissionErrorMessage;
    }

    if (errorMessage) {
      return "Não foi possível carregar as recomendações de hoje.";
    }

    if (isLoading && !missions) {
      return "Carregando suas recomendações do dia...";
    }

    return "Complete suas recomendações para ganhar XP e evoluir de nível.";
  }, [
    completeMissionErrorMessage,
    completionErrorSection,
    errorMessage,
    isLoading,
    missions,
  ]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      <Animated.View entering={FadeInDown.duration(220)} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.title}>Bem-vindo!</Text>
          <View style={styles.notificationButton}>
            <Bell size={18} color="#2C7BE5" />
          </View>
        </View>
        <Text style={styles.subtitle}>Vamos comecar seu plano de autocuidado de hoje?</Text>

        {isPatient ? (
          <Animated.View entering={FadeIn.delay(160).duration(260)} style={styles.levelStrip}>
            <LevelRing nivel={nivel} size={58} strokeWidth={6} delay={200} />
            <View style={styles.levelInfo}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelTitle}>
                  {nivel ? `Nível ${nivel.atual}` : "Seu nível"}
                </Text>
                {xpTotal !== null ? <Text style={styles.levelXp}>{xpTotal} XP</Text> : null}
              </View>
              <AnimatedXpBar
                ratio={nivelRatio(nivel)}
                levelKey={nivel?.atual}
                height={10}
                delay={260}
              />
              <Text style={styles.levelHint}>
                {nivel
                  ? `Faltam ${nivel.xpParaProximo} XP para o nível ${nivel.atual + 1}`
                  : "Carregando seu progresso..."}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(230)}>
        <ChecklistCard
          title="Medicamentos de hoje"
          description={medicationDescription}
          items={medicationItems}
          checkedIds={takenMedicationIds}
          loadingIds={completingMedicationItemIds}
          disabledIds={blockedMedicationItemIds}
          onToggleItem={toggleMedication}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(240)}>
        <ChecklistCard
          title="Recomendações do dia"
          description={missionDescription}
          items={dailyMissionItems}
          checkedIds={completedMissionIds}
          loadingIds={completingDailyMissionItemIds}
          onToggleItem={toggleMission}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(250)} style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.h2}>Progresso de hoje</Text>
          {dailyProgress.isComplete ? <Sparkles size={20} color="#F5B942" /> : null}
        </View>
        <Text style={styles.info}>
          {dailyProgress.isComplete
            ? "Tudo concluído por hoje. Excelente cuidado!"
            : `Você concluiu ${dailyProgress.done} de ${dailyProgress.total} atividades hoje.`}
        </Text>

        <AnimatedXpBar ratio={dailyProgress.ratio} colors={DAILY_PROGRESS_GRADIENT} height={12} />

        {doseProgress ? (
          <Text style={styles.progressHint}>
            Doses registradas hoje: {doseProgress.registradas} de {doseProgress.previstas}
          </Text>
        ) : null}
      </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#12314C",
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    color: "#12314C",
  },
  heroCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 8,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  levelStrip: {
    marginTop: 6,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F1F7FE",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelInfo: {
    flex: 1,
    gap: 5,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  levelTitle: {
    color: "#12314C",
    fontSize: 15,
    fontWeight: "800",
  },
  levelXp: {
    color: "#1A6FD6",
    fontSize: 12,
    fontWeight: "800",
  },
  levelHint: {
    color: "#5B738A",
    fontSize: 12,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#48627A",
    lineHeight: 20,
  },
  info: {
    fontSize: 14,
    color: "#35506B",
    lineHeight: 20,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressHint: {
    color: "#5B738A",
    fontSize: 12,
    fontWeight: "600",
  },
});
