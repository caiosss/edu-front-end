import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Medal, PartyPopper, Star, Trophy } from "lucide-react-native";
import { AchievementBadge } from "../features/gamification/components/achievement-badge";
import { AchievementIcon } from "../features/gamification/components/achievement-icon";
import { AnimatedXpBar } from "../features/gamification/components/animated-xp-bar";
import { LevelRing } from "../features/gamification/components/level-ring";
import { Sparkle } from "../features/gamification/components/sparkle";
import { goldGradient, rewardCardGradient } from "../features/gamification/theme";
import { nivelRatio } from "../features/gamification/utils/level";
import { useGamification } from "../hooks/use-gamification";

const SCREEN_PADDING = 20;
const GRID_GAP = 12;
const MAX_CONTENT_WIDTH = 560;

export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const {
    isPatient,
    nivel,
    xpTotal,
    catalogo,
    desbloqueadas,
    isLoading,
    errorMessage,
    refreshGamification,
  } = useGamification();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const achievements = useMemo(
    () =>
      catalogo.map((conquista) => ({
        conquista,
        unlocked: conquista.id in desbloqueadas,
        dataConquista: desbloqueadas[conquista.id] ?? null,
      })),
    [catalogo, desbloqueadas]
  );

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const nextAchievement = achievements.find((achievement) => !achievement.unlocked) ?? null;
  const tileWidth =
    (Math.min(width, MAX_CONTENT_WIDTH) - SCREEN_PADDING * 2 - GRID_GAP) / 2;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await refreshGamification();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshGamification]);

  if (!isPatient) {
    return (
      <View style={styles.emptyContainer}>
        <Animated.View entering={FadeInDown.duration(240)} style={styles.card}>
          <View style={styles.emptyIcon}>
            <Medal size={28} color="#2C7BE5" />
          </View>
          <Text style={styles.cardTitle}>Disponível para pacientes</Text>
          <Text style={styles.supportingText}>
            Nível, XP e conquistas acompanham os registros de cuidado de cada paciente.
          </Text>
        </Animated.View>
      </View>
    );
  }

  const nextMissingXp =
    nextAchievement && xpTotal !== null
      ? Math.max(0, nextAchievement.conquista.requisitoXp - xpTotal)
      : null;
  const nextRatio =
    nextAchievement && xpTotal !== null && nextAchievement.conquista.requisitoXp > 0
      ? xpTotal / nextAchievement.conquista.requisitoXp
      : 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void handleRefresh()}
          tintColor="#2C7BE5"
          colors={["#2C7BE5"]}
        />
      }
    >
      <Animated.View entering={FadeInDown.duration(260)} style={styles.heroShadow}>
        <LinearGradient
          colors={rewardCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Sparkle x={24} y={22} size={12} delay={200} />
          <Sparkle x={300} y={26} size={10} delay={900} color="#FFFFFF" />
          <Sparkle x={150} y={150} size={9} delay={600} />

          <LevelRing nivel={nivel} size={112} strokeWidth={10} tone="dark" delay={200} />

          <View style={styles.heroInfo}>
            <Text style={styles.heroEyebrow}>Seu progresso</Text>
            <Text style={styles.heroTitle}>
              {nivel ? `Nível ${nivel.atual}` : "Carregando..."}
            </Text>
            <Text style={styles.heroXp}>{xpTotal ?? 0} XP no total</Text>
            <AnimatedXpBar
              ratio={nivelRatio(nivel)}
              levelKey={nivel?.atual}
              colors={goldGradient}
              trackColor="rgba(255, 255, 255, 0.16)"
              height={10}
              delay={300}
            />
            {nivel ? (
              <Text style={styles.heroHint}>
                Faltam {nivel.xpParaProximo} XP para o nível {nivel.atual + 1}
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(260)} style={styles.statsRow}>
        <View style={[styles.card, styles.statCard]}>
          <View style={[styles.statIcon, styles.statIconGold]}>
            <Trophy size={18} color="#E8890C" />
          </View>
          <Text style={styles.statValue}>
            {unlockedCount}/{catalogo.length}
          </Text>
          <Text style={styles.statLabel}>conquistas</Text>
        </View>
        <View style={[styles.card, styles.statCard]}>
          <View style={styles.statIcon}>
            <Star size={18} color="#2C7BE5" />
          </View>
          <Text style={styles.statValue}>{nivel?.xpNoNivel ?? 0}</Text>
          <Text style={styles.statLabel}>XP neste nível</Text>
        </View>
      </Animated.View>

      {nextAchievement ? (
        <Animated.View entering={FadeInDown.delay(140).duration(260)} style={styles.card}>
          <Text style={styles.sectionEyebrow}>Próxima conquista</Text>
          <View style={styles.nextRow}>
            <View style={styles.nextIcon}>
              <AchievementIcon icone={nextAchievement.conquista.icone} size={24} color="#2C7BE5" />
            </View>
            <View style={styles.nextInfo}>
              <Text style={styles.cardTitle}>{nextAchievement.conquista.titulo}</Text>
              <Text style={styles.supportingText}>
                {nextMissingXp !== null && nextMissingXp > 0
                  ? `Faltam ${nextMissingXp} XP`
                  : `${nextAchievement.conquista.requisitoXp} XP`}
              </Text>
            </View>
          </View>
          <AnimatedXpBar ratio={nextRatio} height={10} delay={350} />
        </Animated.View>
      ) : unlockedCount > 0 ? (
        <Animated.View entering={FadeInDown.delay(140).duration(260)} style={styles.card}>
          <View style={styles.nextRow}>
            <View style={[styles.nextIcon, styles.statIconGold]}>
              <PartyPopper size={24} color="#E8890C" />
            </View>
            <View style={styles.nextInfo}>
              <Text style={styles.cardTitle}>Todas as conquistas desbloqueadas!</Text>
              <Text style={styles.supportingText}>Seu cuidado diário fez toda a diferença.</Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(200).duration(260)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Conquistas</Text>
        {catalogo.length > 0 ? (
          <Text style={styles.sectionCounter}>
            {unlockedCount} de {catalogo.length}
          </Text>
        ) : null}
      </Animated.View>

      {isLoading && catalogo.length === 0 ? (
        <View style={[styles.card, styles.loadingBlock]}>
          <ActivityIndicator size="small" color="#2C7BE5" />
          <Text style={styles.supportingText}>Carregando suas conquistas...</Text>
        </View>
      ) : null}

      {errorMessage && catalogo.length === 0 && !isLoading ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => void handleRefresh()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !errorMessage && catalogo.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.supportingText}>
            Nenhuma conquista cadastrada ainda. Continue registrando seus cuidados!
          </Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {achievements.map((achievement, index) => (
          <AchievementBadge
            key={achievement.conquista.id}
            conquista={achievement.conquista}
            unlocked={achievement.unlocked}
            dataConquista={achievement.dataConquista}
            xpTotal={xpTotal}
            index={index}
            isNext={achievement.conquista.id === nextAchievement?.conquista.id}
            style={{ width: tileWidth }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SCREEN_PADDING,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  heroShadow: {
    borderRadius: 22,
    shadowColor: "#12314C",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 8,
  },
  hero: {
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    color: "#8FB7E0",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  heroXp: {
    color: "#FFD43B",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroHint: {
    color: "#B7CFE6",
    fontSize: 12,
    marginTop: 2,
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
  statsRow: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  statCard: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  statIconGold: {
    backgroundColor: "#FFF3BF",
  },
  statValue: {
    color: "#12314C",
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    color: "#5B738A",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionEyebrow: {
    color: "#2C7BE5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  nextInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#12314C",
  },
  supportingText: {
    color: "#35506B",
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#12314C",
  },
  sectionCounter: {
    color: "#5B738A",
    fontSize: 13,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    paddingTop: 6,
  },
  loadingBlock: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
  },
  errorText: {
    color: "#9B2F2F",
    fontSize: 13,
    fontWeight: "600",
  },
  retryButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#2C7BE5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
