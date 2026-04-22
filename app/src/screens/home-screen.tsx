import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import {
  Bell,
  Circle,
  CircleCheck,
  CircleStar,
  GlassWater,
  Pill,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";

type ChecklistItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
};

const medications: ChecklistItem[] = [
  {
    id: "tacrolimo",
    title: "Tacrolimo",
    subtitle: "1 mg - 08:00",
    icon: Pill,
  },
  {
    id: "prednisona",
    title: "Prednisona",
    subtitle: "5 mg - 12:00",
    icon: Pill,
  },
  {
    id: "micofenolato",
    title: "Micofenolato",
    subtitle: "500 mg - 20:00",
    icon: Pill,
  },
];

const dailyMissions: ChecklistItem[] = [
  {
    id: "tomar-medicamentos",
    title: "Tomar todos os medicamentos",
    icon: Pill,
  },
  {
    id: "hidratar",
    title: "Beber 2L de agua",
    icon: GlassWater,
  },
  {
    id: "caminhada",
    title: "Realizar uma leve caminhada",
    icon: Star,
  },
  {
    id: "sintomas",
    title: "Registrar sintomas",
    icon: CircleStar,
  },
];

type ChecklistCardProps = {
  title: string;
  description?: string;
  items: ChecklistItem[];
  checkedIds: string[];
  onToggleItem: (itemId: string) => void;
};

function ChecklistCard({
  title,
  description,
  items,
  checkedIds,
  onToggleItem,
}: ChecklistCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.h2}>{title}</Text>
      {description ? <Text style={styles.info}>{description}</Text> : null}

      <View style={styles.checklistGroup}>
        {items.map((item) => {
          const isChecked = checkedIds.includes(item.id);
          const ItemIcon = item.icon;

          return (
            <Animated.View key={item.id} layout={LinearTransition.duration(220)}>
              <Pressable
                onPress={() => onToggleItem(item.id)}
                style={[styles.checklistRow, isChecked ? styles.checklistRowChecked : null]}
              >
                <View style={styles.checklistLeft}>
                  <View style={[styles.iconBadge, isChecked ? styles.iconBadgeChecked : null]}>
                    <ItemIcon size={15} color={isChecked ? "#1A6FD6" : "#4F6982"} />
                  </View>
                  <View style={styles.checklistTextBlock}>
                    <Text style={styles.checklistTitle}>{item.title}</Text>
                    {item.subtitle ? (
                      <Text style={styles.checklistSubtitle}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.checklistRight}>
                  {isChecked ? (
                    <CircleCheck size={18} color="#1A6FD6" />
                  ) : (
                    <Circle size={18} color="#7D94AB" />
                  )}
                  <Text
                    style={[
                      styles.checkActionLabel,
                      isChecked ? styles.checkActionLabelDone : null,
                    ]}
                  >
                    {isChecked ? "Concluído" : "Concluir"}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { nome } = useAuth();
  const [takenMedicationIds, setTakenMedicationIds] = useState<string[]>([]);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

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
    const totalActivities = medications.length + dailyMissions.length;
    const completedActivities = takenMedicationIds.length + completedMissionIds.length;

    if (completedActivities === 0) {
      return 0;
    }

    return Math.max(1, Math.round((completedActivities / totalActivities) * 7));
  }, [completedMissionIds.length, takenMedicationIds.length]);

  const weeklyProgressRatio = weeklyCompletedDays / 7;
  const weeklyProgressWidth = progressTrackWidth * weeklyProgressRatio;
  const welcomeName = nome ?? "paciente";

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
          <Text style={styles.title}>Bem-vindo, {welcomeName}</Text>
          <View style={styles.notificationButton}>
            <Bell size={18} color="#2C7BE5" />
          </View>
        </View>
        <Text style={styles.subtitle}>Vamos começar seu plano de autocuidado de hoje?</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(230)}>
        <ChecklistCard
          title="Medicamentos de hoje"
          description="Acompanhe e marque cada dose no horário certo."
          items={medications}
          checkedIds={takenMedicationIds}
          onToggleItem={toggleMedication}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(240)}>
        <ChecklistCard
          title="Missões do dia"
          description="Complete suas missões para ganhar pontos e evoluir."
          items={dailyMissions}
          checkedIds={completedMissionIds}
          onToggleItem={toggleMission}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(250)} style={styles.card}>
        <Text style={styles.h2}>Progresso semanal</Text>
        <Text style={styles.info}>
          Você completou {weeklyCompletedDays} de 7 dias de autocuidado esta semana.
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
  checklistGroup: {
    gap: 8,
  },
  checklistRow: {
    borderRadius: 12,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F4F8FC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  checklistRowChecked: {
    backgroundColor: "#E8F2FF",
  },
  checklistLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DFEAF5",
  },
  iconBadgeChecked: {
    backgroundColor: "#CEE4FF",
  },
  checklistTextBlock: {
    flex: 1,
    gap: 2,
  },
  checklistTitle: {
    color: "#14324C",
    fontSize: 14,
    fontWeight: "600",
  },
  checklistSubtitle: {
    color: "#5B738A",
    fontSize: 12,
  },
  checklistRight: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 98,
    gap: 2,
  },
  checkActionLabel: {
    fontSize: 11,
    color: "#5B738A",
    textAlign: "center",
    lineHeight: 14,
  },
  checkActionLabelDone: {
    color: "#1A6FD6",
    fontWeight: "700",
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
