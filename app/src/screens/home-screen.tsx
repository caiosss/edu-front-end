import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  Bell,
  CircleStar,
  HeartHandshake,
  Flame,
  GlassWater,
  Pill,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import { AppText, BigButton, Card, StatusBanner } from "../components/ui";
import { AnimatedXpBar } from "../features/gamification/components/animated-xp-bar";
import { LevelRing } from "../features/gamification/components/level-ring";
import type { ConclusaoResponse, ProgressoDoDia } from "../features/gamification/types";
import { nivelRatio } from "../features/gamification/utils/level";
import type {
  DoseRegistrada,
  GeneralMissionResponse,
  MedicationMissionResponse,
} from "../features/home/types";
import { firstName, formatLongDate, greetingFor } from "../features/home/utils/date-labels";
import {
  getMedicationScheduleInfo,
  type MedicationScheduleInfo,
} from "../features/home/utils/medication-schedule";
import ChecklistCard, {
  type ChecklistItem,
} from "../features/navigation/components/check-list-card";
import { useAuth } from "../hooks/useAuth";
import { useCaregiverProfile } from "../hooks/use-caregiver-profile";
import { useCompleteMission } from "../hooks/use-complete-mission";
import { syncGamificationAfterReward, useGamification } from "../hooks/use-gamification";
import { InstallHint } from "../features/pwa/install-hint";
import { useHomeMissions } from "../hooks/use-home-missions";
import { usePatientProfile } from "../hooks/use-patient-profile";
import { useTodayDoses } from "../hooks/use-today-doses";
import { useGamificationStore } from "../store/gamification-store";
import { confirmAction } from "../utils/confirm-action";

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
  scheduleInfo: MedicationScheduleInfo
): ChecklistItem => {
  const subtitleParts: string[] = [];
  // A dose e a do horario vigente: o mesmo remedio pode ser 2 comprimidos de manha e 1 a noite.
  const doseLabel = scheduleInfo.doseLabel || mission.dosagem.trim();

  if (doseLabel) {
    subtitleParts.push(doseLabel);
  }

  if (scheduleInfo.scheduledTimeLabel) {
    subtitleParts.push(scheduleInfo.scheduledTimeLabel);
  }

  if (scheduleInfo.weekdaysLabel) {
    subtitleParts.push(scheduleInfo.weekdaysLabel);
  }

  return {
    id: mission.id,
    title: mission.nomeMedicamento,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined,
    icon: Pill,
    disabledLabel: scheduleInfo.disabledLabel,
    notice:
      scheduleInfo.noticeMessage && scheduleInfo.noticeTone
        ? {
            message: scheduleInfo.noticeMessage,
            tone: scheduleInfo.noticeTone,
          }
        : undefined,
  };
};

/** `LocalTime.toString()` do backend ("08:00", "08:00:30.123") cortado em horas e minutos. */
const formatTime = (value: string | null): string | null => (value ? value.slice(0, 5) : null);

/** Rotulo do item quando o cuidador so pode ver: sem `AGIR_PELO_PACIENTE`, nada e registrado. */
const READ_ONLY_LABEL = "Só ver";

export default function HomeScreen() {
  const { nome, tipoUsuario } = useAuth();
  const isCaregiver = tipoUsuario === "CUIDADOR";
  // O nome do token basta para o paciente. O cuidador sempre busca o perfil: e dele que sai o
  // paciente sobre o qual age, que nao vai no token (SPEC-014 §5.7).
  const { patientProfile } = usePatientProfile({ enabled: !nome && !isCaregiver });
  const {
    caregiverProfile,
    isLoading: isCaregiverProfileLoading,
    errorMessage: caregiverProfileErrorMessage,
    refreshCaregiverProfile,
  } = useCaregiverProfile({ enabled: isCaregiver });

  // O cuidador le o plano com VER_ADESAO e VER_MEDICACAO e registra com AGIR_PELO_PACIENTE.
  const caregiverPatientId =
    isCaregiver && caregiverProfile?.status === "ATIVO" ? caregiverProfile.pacienteId : null;
  const caregiverScopes = caregiverProfile?.escopos ?? [];
  const caregiverCanSee =
    Boolean(caregiverPatientId) &&
    caregiverScopes.includes("VER_ADESAO") &&
    caregiverScopes.includes("VER_MEDICACAO");
  const caregiverCanAct = caregiverCanSee && caregiverScopes.includes("AGIR_PELO_PACIENTE");
  const isReadOnly = isCaregiver && !caregiverCanAct;
  const patientFirstName = firstName(caregiverProfile?.pacienteNome);

  const { missions, isLoading, errorMessage, refreshHomeMissions } = useHomeMissions({
    enabled: !isCaregiver || caregiverCanSee,
    pacienteId: caregiverPatientId,
  });
  const {
    doses: todayDoses,
    contestingIds,
    errorMessage: contestErrorMessage,
    refreshTodayDoses,
    contest,
  } = useTodayDoses({ enabled: !isCaregiver });
  const {
    completeMission,
    completingMissionKeys,
    errorMessage: completeMissionErrorMessage,
  } = useCompleteMission();
  const { isPatient, nivel, xpTotal, streak } = useGamification();
  const applyConclusao = useGamificationStore((state) => state.applyConclusao);

  /** `slotKey` das doses registradas nesta sessao: uma dose nova nao herda o registro anterior. */
  const [registeredDoseKeys, setRegisteredDoseKeys] = useState<string[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [doseProgress, setDoseProgress] = useState<ProgressoDoDia | null>(null);
  const [completionErrorSection, setCompletionErrorSection] = useState<
    "medication" | "mission" | null
  >(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const handleConclusao = useCallback(
    (conclusao: ConclusaoResponse) => {
      // O XP do registro do cuidador vai para o paciente; o cuidador nao acumula nada.
      if (!isCaregiver) {
        applyConclusao(conclusao);
      }

      if (conclusao.registro?.progressoDoDia) {
        setDoseProgress(conclusao.registro.progressoDoDia);
      }

      // O estado `concluido` e derivado no backend; a conquista destrava de forma assincrona.
      void refreshHomeMissions();

      if (!isCaregiver) {
        syncGamificationAfterReward();
      }
    },
    [applyConclusao, isCaregiver, refreshHomeMissions]
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // O app costuma ficar aberto em segundo plano; ao voltar, o horario e o dia podem ter mudado.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setCurrentDate(new Date());
        void refreshHomeMissions();
        void refreshTodayDoses();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshHomeMissions, refreshTodayDoses]);

  const medicationScheduleById = useMemo(() => {
    const scheduleById = new Map<string, MedicationScheduleInfo>();

    if (!missions) {
      return scheduleById;
    }

    missions.missoesMedicamento.forEach((mission) => {
      scheduleById.set(mission.id, getMedicationScheduleInfo(mission, currentDate));
    });

    return scheduleById;
  }, [currentDate, missions]);

  // Quando chega o horario de uma nova dose, o `concluida` do backend passa a valer para ela:
  // recarrega para nao mostrar a dose nova como ja tomada.
  const doseSlotsSignature = useMemo(
    () =>
      Array.from(medicationScheduleById.values())
        .map((info) => info.slotKey)
        .sort()
        .join("|"),
    [medicationScheduleById]
  );
  const previousSlotsSignature = useRef(doseSlotsSignature);

  useEffect(() => {
    if (previousSlotsSignature.current === doseSlotsSignature) {
      return;
    }

    const hadSlots = previousSlotsSignature.current !== "";
    previousSlotsSignature.current = doseSlotsSignature;

    if (hadSlots) {
      void refreshHomeMissions();
    }
  }, [doseSlotsSignature, refreshHomeMissions]);

  /** So os remedios com dose hoje entram no checklist e no progresso do dia. */
  const activeMedicationMissions = useMemo(
    () =>
      missions?.missoesMedicamento.filter(
        (mission) =>
          mission.ativo && medicationScheduleById.get(mission.id)?.status !== "off-day"
      ) ?? [],
    [medicationScheduleById, missions]
  );

  /** "Hoje sem dose: Metotrexato (na quarta às 8h)." Vazio quando todos tem dose hoje. */
  const offDayMedicationNote = useMemo(() => {
    const offDay =
      missions?.missoesMedicamento.filter(
        (mission) =>
          mission.ativo && medicationScheduleById.get(mission.id)?.status === "off-day"
      ) ?? [];

    if (offDay.length === 0) {
      return "";
    }

    const names = offDay.map((mission) => {
      const next = medicationScheduleById.get(mission.id)?.offDayLabel;
      return next ? `${mission.nomeMedicamento} (${next})` : mission.nomeMedicamento;
    });

    return `Hoje sem dose: ${names.join(", ")}.`;
  }, [medicationScheduleById, missions]);

  const medicationItems = useMemo(
    () =>
      activeMedicationMissions.flatMap((mission) => {
        const scheduleInfo = medicationScheduleById.get(mission.id);

        if (!scheduleInfo) {
          return [];
        }

        const item = mapMedicationMissionToChecklistItem(mission, scheduleInfo);
        return [isReadOnly ? { ...item, disabledLabel: READ_ONLY_LABEL } : item];
      }),
    [activeMedicationMissions, isReadOnly, medicationScheduleById]
  );

  const takenMedicationIds = useMemo(
    () =>
      activeMedicationMissions
        .filter((mission) => {
          const scheduleInfo = medicationScheduleById.get(mission.id);

          return (
            scheduleInfo?.status === "done" ||
            (scheduleInfo?.status !== "upcoming" &&
              registeredDoseKeys.includes(scheduleInfo?.slotKey ?? ""))
          );
        })
        .map((mission) => mission.id),
    [activeMedicationMissions, medicationScheduleById, registeredDoseKeys]
  );

  const dailyMissionItems = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesGerais
      .filter((mission) => mission.ativa)
      .map(mapGeneralMissionToChecklistItem)
      .map((item) => (isReadOnly ? { ...item, disabledLabel: READ_ONLY_LABEL } : item));
  }, [isReadOnly, missions]);

  const completedDailyMissionItemIds = useMemo(() => {
    if (!missions) {
      return [];
    }

    return missions.missoesGerais
      .filter((mission) => mission.ativa && mission.concluida)
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

  const blockedMedicationItemIds = useMemo(
    () =>
      activeMedicationMissions
        .filter(
          (mission) =>
            !takenMedicationIds.includes(mission.id) &&
            (isReadOnly || medicationScheduleById.get(mission.id)?.status === "upcoming")
        )
        .map((mission) => mission.id),
    [activeMedicationMissions, isReadOnly, medicationScheduleById, takenMedicationIds]
  );

  const blockedDailyMissionItemIds = useMemo(
    () => (isReadOnly ? dailyMissionItems.map((item) => item.id) : []),
    [dailyMissionItems, isReadOnly]
  );

  /** Doses que o cuidador registrou hoje: o paciente pode contestar no mesmo dia (SPEC-014 §5.5). */
  const caregiverDoses = useMemo(
    () => todayDoses.filter((dose) => dose.registradoPor === "CUIDADOR"),
    [todayDoses]
  );

  const medicationNameByItemId = useMemo(() => {
    const names = new Map<string, string>();
    missions?.missoesMedicamento.forEach((mission) => {
      names.set(mission.id, mission.nomeMedicamento);
    });
    return names;
  }, [missions]);

  const hasOverdueMedication = useMemo(
    () =>
      activeMedicationMissions.some(
        (mission) =>
          !takenMedicationIds.includes(mission.id) &&
          medicationScheduleById.get(mission.id)?.status === "late"
      ),
    [activeMedicationMissions, medicationScheduleById, takenMedicationIds]
  );

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
      isReadOnly ||
      takenMedicationIds.includes(itemId) ||
      completingMedicationItemIds.includes(itemId)
    ) {
      return;
    }

    const scheduleInfo = medicationScheduleById.get(itemId);

    if (!scheduleInfo || scheduleInfo.status === "upcoming") {
      return;
    }

    setCompletionErrorSection(null);

    const conclusao = await completeMission({
      pacienteId: caregiverPatientId ?? undefined,
      prescricaoItemId: itemId,
    });

    if (conclusao) {
      setRegisteredDoseKeys((currentKeys) =>
        currentKeys.includes(scheduleInfo.slotKey)
          ? currentKeys
          : [...currentKeys, scheduleInfo.slotKey]
      );
      setCompletionErrorSection(null);
      handleConclusao(conclusao);
    } else {
      setCompletionErrorSection("medication");
    }
  };

  const toggleMission = async (itemId: string) => {
    if (
      isReadOnly ||
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
      pacienteId: caregiverPatientId ?? undefined,
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

  const confirmContestDose = (dose: DoseRegistrada) => {
    const medicationName = medicationNameByItemId.get(dose.prescricaoItemId) ?? "esta dose";

    confirmAction({
      title: "Você não tomou esta dose?",
      message: `A dose de ${medicationName} sai das doses tomadas de hoje. Ela não poderá ser registrada de novo.`,
      confirmLabel: "Não tomei",
      destructive: true,
      onConfirm: () => void contest(dose.id),
    });
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

  const name = firstName(nome ?? patientProfile?.nomeCompleto ?? caregiverProfile?.nomeCompleto);
  const greeting = name ? `${greetingFor(currentDate)}, ${name}!` : `${greetingFor(currentDate)}!`;
  const heroSubtitle =
    isCaregiver && patientFirstName
      ? `Cuidados de hoje de ${patientFirstName}.`
      : "Vamos começar os cuidados de hoje?";

  /** Aviso do cuidador sem vinculo ativo ou sem permissao para ver o plano. */
  const caregiverAccessMessage = useMemo(() => {
    if (!isCaregiver || caregiverCanSee || !caregiverProfile) {
      return "";
    }

    if (!caregiverProfile.pacienteId || caregiverProfile.status !== "ATIVO") {
      return "Você ainda não acompanha nenhum paciente. Peça um convite à pessoa que você cuida.";
    }

    return `${patientFirstName ?? "O paciente"} ainda não liberou para você ver os remédios e as doses. Peça para liberar em "Meus cuidadores", no perfil.`;
  }, [caregiverCanSee, caregiverProfile, isCaregiver, patientFirstName]);

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

    if (medicationItems.length === 0 && offDayMedicationNote) {
      return "Hoje não há doses previstas.";
    }

    if (hasOverdueMedication) {
      return "Confira os medicamentos em vermelho: o horário já passou.";
    }

    if (isReadOnly) {
      return `Você pode acompanhar as doses de ${patientFirstName ?? "quem você cuida"}, mas não registrar.`;
    }

    if (blockedMedicationItemIds.length > 0) {
      return "Alguns medicamentos ainda não estão no horário.";
    }

    if (isCaregiver) {
      return `Marque cada dose que ${patientFirstName ?? "a pessoa"} tomar, no horário certo.`;
    }

    return "Acompanhe e marque cada dose no horário certo.";
  }, [
    blockedMedicationItemIds.length,
    isCaregiver,
    isReadOnly,
    patientFirstName,
    completeMissionErrorMessage,
    completionErrorSection,
    errorMessage,
    hasOverdueMedication,
    isLoading,
    medicationItems.length,
    missions,
    offDayMedicationNote,
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

    if (isReadOnly) {
      return "Você pode acompanhar as recomendações do dia, mas não registrar.";
    }

    if (isCaregiver) {
      return `Marque as recomendações que ${patientFirstName ?? "a pessoa"} cumprir hoje.`;
    }

    return "Complete suas recomendações para ganhar XP e evoluir de nível.";
  }, [
    isCaregiver,
    isReadOnly,
    patientFirstName,
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
      <InstallHint />

      <Animated.View entering={FadeInDown.duration(220)} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleBlock}>
            <Text style={styles.title} accessibilityRole="header">
              {greeting}
            </Text>
            <Text style={styles.dateText}>{formatLongDate(currentDate)}</Text>
          </View>
          <View style={styles.notificationButton}>
            <Bell size={22} color="#2C7BE5" />
          </View>
        </View>
        <Text style={styles.subtitle}>{heroSubtitle}</Text>

        {isPatient ? (
          <Animated.View entering={FadeIn.delay(160).duration(260)} style={styles.levelStrip}>
            <LevelRing nivel={nivel} size={64} strokeWidth={6} delay={200} />
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
                height={12}
                delay={260}
              />
              <Text style={styles.levelHint}>
                {nivel
                  ? `Faltam ${nivel.xpParaProximo} XP para o nível ${nivel.atual + 1}`
                  : "Carregando seu progresso..."}
              </Text>
              {streak && streak.atual > 0 ? (
                <View style={styles.streakChip}>
                  <Flame size={16} color="#E8590C" />
                  <Text style={styles.streakText}>
                    Sequência: {streak.atual} {streak.atual === 1 ? "dia" : "dias"}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>

      {caregiverAccessMessage ? (
        <StatusBanner tone="info" message={caregiverAccessMessage} />
      ) : null}

      {isCaregiver && caregiverProfileErrorMessage && !caregiverProfile ? (
        <StatusBanner
          tone="danger"
          message={caregiverProfileErrorMessage}
          action={{ label: "Tentar de novo", onPress: () => void refreshCaregiverProfile() }}
        />
      ) : null}

      {isCaregiver && isCaregiverProfileLoading && !caregiverProfile ? (
        <Text style={styles.info}>Carregando os dados de quem você acompanha...</Text>
      ) : null}

      {!isCaregiver || caregiverCanSee ? (
        <>
          <Animated.View entering={FadeInDown.delay(60).duration(230)}>
            <ChecklistCard
              title="Medicamentos de hoje"
              description={medicationDescription}
              items={medicationItems}
              checkedIds={takenMedicationIds}
              loadingIds={completingMedicationItemIds}
              disabledIds={blockedMedicationItemIds}
              onToggleItem={toggleMedication}
              footnote={offDayMedicationNote || undefined}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(240)}>
            <ChecklistCard
              title="Recomendações do dia"
              description={missionDescription}
              items={dailyMissionItems}
              checkedIds={completedMissionIds}
              loadingIds={completingDailyMissionItemIds}
              disabledIds={blockedDailyMissionItemIds}
              onToggleItem={toggleMission}
            />
          </Animated.View>

          {caregiverDoses.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(150).duration(240)}>
              <Card>
                <View style={styles.caregiverDosesHeader}>
                  <HeartHandshake size={24} color="#1155AA" />
                  <AppText variant="heading" style={styles.caregiverDosesTitle}>
                    Registradas pelo cuidador
                  </AppText>
                </View>
                <AppText color="textSecondary">
                  Se você não tomou alguma destas doses, avise hoje mesmo.
                </AppText>

                {contestErrorMessage ? (
                  <StatusBanner tone="danger" message={contestErrorMessage} />
                ) : null}

                {caregiverDoses.map((dose) => {
                  const registeredAt = formatTime(dose.horarioRegistrado);
                  const scheduledAt = formatTime(dose.horarioPrevisto);
                  const details = [
                    scheduledAt ? `Dose das ${scheduledAt}` : null,
                    registeredAt ? `marcada às ${registeredAt}` : null,
                  ].filter(Boolean);

                  return (
                    <View key={dose.id} style={styles.caregiverDoseRow}>
                      <AppText variant="bodyStrong">
                        {medicationNameByItemId.get(dose.prescricaoItemId) ?? "Remédio"}
                      </AppText>
                      {details.length > 0 ? (
                        <AppText variant="small" color="textSecondary">
                          {details.join(", ")}
                        </AppText>
                      ) : null}
                      {dose.contestada ? (
                        <AppText variant="smallStrong" color="warning">
                          Você avisou que não tomou. Ela não conta como tomada.
                        </AppText>
                      ) : (
                        <BigButton
                          label="Não tomei esta dose"
                          variant="secondary"
                          loading={contestingIds.includes(dose.id)}
                          disabled={contestingIds.includes(dose.id)}
                          onPress={() => confirmContestDose(dose)}
                        />
                      )}
                    </View>
                  );
                })}
              </Card>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(180).duration(250)} style={styles.card}>
            <View style={styles.progressHeader}>
              <Text style={styles.h2}>Progresso de hoje</Text>
              {dailyProgress.isComplete ? <Sparkles size={24} color="#F5B942" /> : null}
            </View>
            <Text style={styles.info}>
              {dailyProgress.isComplete
                ? "Tudo concluído por hoje. Excelente cuidado!"
                : `Você concluiu ${dailyProgress.done} de ${dailyProgress.total} atividades hoje.`}
            </Text>

            <AnimatedXpBar ratio={dailyProgress.ratio} colors={DAILY_PROGRESS_GRADIENT} height={14} />

            {doseProgress ? (
              <Text style={styles.progressHint}>
                Doses registradas hoje: {doseProgress.registradas} de {doseProgress.previstas}
              </Text>
            ) : null}
          </Animated.View>
        </>
      ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 16,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: "#12314C",
  },
  dateText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    color: "#35506B",
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#12314C",
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 10,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 2,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  levelStrip: {
    marginTop: 6,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#F1F7FE",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  levelInfo: {
    flex: 1,
    gap: 6,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  levelTitle: {
    color: "#12314C",
    fontSize: 19,
    fontWeight: "800",
  },
  levelXp: {
    color: "#1A6FD6",
    fontSize: 16,
    fontWeight: "800",
  },
  levelHint: {
    color: "#48627A",
    fontSize: 16,
    lineHeight: 22,
  },
  streakChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FFF4E6",
  },
  streakText: {
    color: "#7A3E00",
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#FDFEFF",
    shadowColor: "#173B5D",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  subtitle: {
    fontSize: 18,
    color: "#35506B",
    lineHeight: 26,
  },
  info: {
    fontSize: 18,
    color: "#35506B",
    lineHeight: 26,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressHint: {
    color: "#48627A",
    fontSize: 16,
    fontWeight: "600",
  },
  caregiverDosesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  caregiverDosesTitle: {
    flex: 1,
  },
  caregiverDoseRow: {
    borderRadius: 12,
    backgroundColor: "#F4F7FB",
    padding: 12,
    gap: 6,
  },
});
