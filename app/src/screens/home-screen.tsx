import { useEffect, useMemo, useState } from "react";
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
import ChecklistCard, {
  type ChecklistItem,
} from "../features/navigation/components/check-list-card";
import { useAuth } from "../hooks/useAuth";
import { useHomeMissions } from "../hooks/use-home-missions";

const formatTimeLabel = (value: string): string => {
  const normalizedTime = value.trim();

  if (!normalizedTime) {
    return "";
  }

  const parsedTime = normalizedTime.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

  if (parsedTime) {
    return `${parsedTime[1]}:${parsedTime[2]}`;
  }

  return normalizedTime;
};

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
  mission: MedicationMissionResponse
): ChecklistItem => {
  const subtitleParts: string[] = [];

  if (mission.dosagem.trim()) {
    subtitleParts.push(mission.dosagem.trim());
  }

  const firstDoseTime = formatTimeLabel(mission.horarioPrimeiraDose);

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
  };
};

export default function HomeScreen() {
  const { nome, role } = useAuth();
  const { missions, isLoading, errorMessage } = useHomeMissions();

  const [takenMedicationIds, setTakenMedicationIds] = useState<string[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  const medicationItems = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesMedicamento
      .filter((mission) => mission.ativo)
      .map(mapMedicationMissionToChecklistItem);
  }, [missions]);

  const dailyMissionItems = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesGerais
      .filter((mission) => mission.ativa)
      .map(mapGeneralMissionToChecklistItem);
  }, [missions]);

  useEffect(() => {
    setTakenMedicationIds((currentIds) =>
      currentIds.filter((id) => medicationItems.some((item) => item.id === id))
    );
  }, [medicationItems]);

  useEffect(() => {
    setCompletedMissionIds((currentIds) =>
      currentIds.filter((id) => dailyMissionItems.some((item) => item.id === id))
    );
  }, [dailyMissionItems]);

  const toggleMedication = (itemId: string) => {
    setTakenMedicationIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId]
    );
  };

  const toggleMission = (itemId: string) => {
    setCompletedMissionIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId]
    );
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
    if (errorMessage) {
      return "Nao foi possivel carregar os medicamentos de hoje.";
    }

    if (isLoading && !missions) {
      return "Carregando seus medicamentos de hoje...";
    }

    return "Acompanhe e marque cada dose no horario certo.";
  }, [errorMessage, isLoading, missions]);

  const missionDescription = useMemo(() => {
    if (errorMessage) {
      return "Nao foi possivel carregar as missoes de hoje.";
    }

    if (isLoading && !missions) {
      return "Carregando suas missoes do dia...";
    }

    return "Complete suas missoes para ganhar pontos e evoluir.";
  }, [errorMessage, isLoading, missions]);

  const handleProgressTrackLayout = (event: LayoutChangeEvent) => {
    setProgressTrackWidth(event.nativeEvent.layout.width);
  };

  return (
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
          onToggleItem={toggleMedication}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(240)}>
        <ChecklistCard
          title="Missoes do dia"
          description={missionDescription}
          items={dailyMissionItems}
          checkedIds={completedMissionIds}
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
  );
}

const styles = StyleSheet.create({
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
