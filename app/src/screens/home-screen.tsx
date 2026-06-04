import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import {
  Bell,
  CircleStar,
  GlassWater,
  Pill,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import type {
  GeneralMissionResponse,
  MedicationMissionResponse,
} from "../features/home/types";
import { MissionCompletionFeedback } from "../features/home/components/mission-completion-feedback";
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
import { useHomeMissions } from "../hooks/use-home-missions";

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
  const { missions, isLoading, errorMessage } = useHomeMissions();
  const {
    completeMission,
    completingMissionKeys,
    errorMessage: completeMissionErrorMessage,
  } = useCompleteMission();

  const [takenMedicationIds, setTakenMedicationIds] = useState<string[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [completionFeedback, setCompletionFeedback] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [completionErrorSection, setCompletionErrorSection] = useState<
    "medication" | "mission" | null
  >(null);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const hideCompletionFeedback = useCallback(() => {
    setCompletionFeedback(null);
  }, []);

  const showCompletionFeedback = useCallback((message: string) => {
    setCompletionFeedback({
      id: Date.now(),
      message,
    });
  }, []);

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
      .filter(
        (mission) =>
          completingMissionKeySet.has(mission.id) ||
          completingMissionKeySet.has(mission.missaoId)
      )
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

    const completionMessage = await completeMission({
      prescricaoId: medicationMission.id,
    });

    if (completionMessage) {
      setTakenMedicationIds((currentIds) =>
        currentIds.includes(itemId) ? currentIds : [...currentIds, itemId]
      );
      setCompletionErrorSection(null);
      showCompletionFeedback(completionMessage);
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

    const completionMessage = await completeMission({
      missaoId: mission.missaoId,
    });

    if (completionMessage) {
      setCompletedMissionIds((currentIds) =>
        currentIds.includes(itemId) ? currentIds : [...currentIds, itemId]
      );
      setCompletionErrorSection(null);
      showCompletionFeedback(completionMessage);
    } else {
      setCompletionErrorSection("mission");
    }
  };

  const weeklyCompletedDays = useMemo(() => {
    const totalActivities = medicationItems.length + dailyMissionItems.length;
    const completedActivities = takenMedicationIds.length + completedMissionIds.length;

    if (completedActivities === 0 || totalActivities === 0) {
      return 0;
    }

    return Math.max(1, Math.round((completedActivities / totalActivities) * 7));
  }, [
    completedMissionIds.length,
    dailyMissionItems.length,
    medicationItems.length,
    takenMedicationIds.length,
  ]);

  const weeklyProgressRatio = weeklyCompletedDays / 7;
  const weeklyProgressWidth = progressTrackWidth * weeklyProgressRatio;
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

    return "Complete suas recomendações para ganhar pontos e evoluir.";
  }, [
    completeMissionErrorMessage,
    completionErrorSection,
    errorMessage,
    isLoading,
    missions,
  ]);

  const handleProgressTrackLayout = (event: LayoutChangeEvent) => {
    setProgressTrackWidth(event.nativeEvent.layout.width);
  };

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
        <Text style={styles.h2}>Progresso semanal</Text>
        <Text style={styles.info}>
          Voce completou {weeklyCompletedDays} de 7 dias de autocuidado esta semana.
        </Text>

        <View style={styles.progressRow}>
          <View onLayout={handleProgressTrackLayout} style={styles.progressTrack}>
            <Animated.View
              layout={LinearTransition.duration(280)}
              style={[styles.progressFill, { width: weeklyProgressWidth }]}
            />
          </View>
          <CircleStar size={18} color="#2C7BE5" />
        </View>
      </Animated.View>
      </ScrollView>

      <MissionCompletionFeedback
        animationKey={completionFeedback?.id ?? 0}
        message={completionFeedback?.message ?? ""}
        visible={Boolean(completionFeedback)}
        onHide={hideCompletionFeedback}
      />
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
  progressRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#DFEAF5",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2C7BE5",
  },
});
