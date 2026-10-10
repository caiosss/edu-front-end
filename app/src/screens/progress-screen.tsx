import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronLeft, CloudOff, Info, Medal } from "lucide-react-native";
import { AchievementBadge } from "../features/gamification/components/achievement-badge";
import type { ExtratoLinha, PeriodoResumo } from "../features/gamification/types";
import { formatClock } from "../features/gamification/utils/format";
import { AchievementsCard } from "../features/progress/components/achievements-card";
import { RewardExplanationModal } from "../features/progress/components/reward-explanation-modal";
import { RewardRow } from "../features/progress/components/reward-row";
import { RewardsCard } from "../features/progress/components/rewards-card";
import { TodayCard } from "../features/progress/components/today-card";
import { TrendCard } from "../features/progress/components/trend-card";
import { achievementProgressRatio } from "../features/progress/labels";
import { useGamification } from "../hooks/use-gamification";
import { useProgressSummary } from "../hooks/use-progress-summary";
import { useRewardStatement } from "../hooks/use-reward-statement";

type ProgressView = "resumo" | "conquistas" | "extrato";

const SCREEN_PADDING = 20;
const GRID_GAP = 12;
const MAX_CONTENT_WIDTH = 560;

function SubviewHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.subviewHeader}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Voltar para o resumo"
        hitSlop={8}
        style={styles.backButton}
      >
        <ChevronLeft size={22} color="#12314C" />
      </Pressable>
      <Text style={styles.subviewTitle} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

/**
 * Tela de Progresso (SPEC-007). Ordem fixa de leitura: Hoje, Tendencia, Conquistas e, por
 * ultimo, Recompensas — o concreto e clinico antes do ludico.
 */
export default function ProgressScreen() {
  const { width } = useWindowDimensions();
  const { isPatient, conquistas, refreshGamification } = useGamification();
  const [periodo, setPeriodo] = useState<PeriodoResumo>("SEMANA");
  const [view, setView] = useState<ProgressView>("resumo");
  const [recompensaAberta, setRecompensaAberta] = useState<ExtratoLinha | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { resumo, atualizadoEm, isLoading, errorMessage, isStale, refresh } = useProgressSummary(
    periodo,
    isPatient
  );
  const extrato = useRewardStatement(isPatient && view === "extrato");

  useEffect(() => {
    if (view === "resumo") {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setView("resumo");
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [view]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await Promise.all([refresh(), refreshGamification()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, refreshGamification]);

  const proximaConquista = useMemo(
    () =>
      conquistas
        .filter((conquista) => conquista.desbloqueadaEm === null && conquista.progresso)
        .sort(
          (a, b) => achievementProgressRatio(b.progresso) - achievementProgressRatio(a.progresso)
        )[0] ?? null,
    [conquistas]
  );

  if (!isPatient) {
    return (
      <View style={styles.emptyContainer}>
        <Animated.View entering={FadeInDown.duration(240)} style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Medal size={28} color="#2C7BE5" />
          </View>
          <Text style={styles.emptyTitle}>Disponível para pacientes</Text>
          <Text style={styles.supportingText}>
            O progresso acompanha os registros de cuidado de cada paciente.
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (view === "conquistas") {
    const tileWidth = (Math.min(width, MAX_CONTENT_WIDTH) - SCREEN_PADDING * 2 - GRID_GAP) / 2;
    const obtidas = conquistas.filter((conquista) => conquista.desbloqueadaEm !== null).length;

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SubviewHeader title="Conquistas" onBack={() => setView("resumo")} />
        {conquistas.length > 0 ? (
          <Text style={styles.supportingText}>
            {obtidas} de {conquistas.length} conquistadas
          </Text>
        ) : (
          <Text style={styles.supportingText}>Nenhuma conquista disponível ainda.</Text>
        )}
        <View style={styles.grid}>
          {conquistas.map((conquista, index) => (
            <AchievementBadge
              key={conquista.codigo}
              conquista={conquista}
              index={index}
              isNext={conquista.codigo === proximaConquista?.codigo}
              style={{ width: tileWidth }}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  if (view === "extrato") {
    return (
      <View style={styles.flex}>
        <View style={styles.statementHeader}>
          <SubviewHeader title="Extrato de recompensas" onBack={() => setView("resumo")} />
          <Text style={styles.supportingText}>Toque em uma linha para ver por que ela aconteceu.</Text>
        </View>
        <FlatList
          data={extrato.linhas}
          keyExtractor={(linha, index) => `${linha.quando}-${linha.regraCodigo}-${index}`}
          contentContainerStyle={styles.statementList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <RewardRow linha={item} onPress={setRecompensaAberta} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => void extrato.loadMore()}
          refreshControl={
            <RefreshControl
              refreshing={extrato.isLoading && extrato.linhas.length > 0}
              onRefresh={() => void extrato.refresh()}
              tintColor="#2C7BE5"
              colors={["#2C7BE5"]}
            />
          }
          ListEmptyComponent={
            extrato.isLoading ? (
              <ActivityIndicator color="#2C7BE5" style={styles.listLoading} />
            ) : (
              <Text style={styles.supportingText}>
                {extrato.errorMessage || "Suas recompensas aparecem aqui depois dos primeiros registros."}
              </Text>
            )
          }
          ListFooterComponent={
            extrato.isLoadingMore ? <ActivityIndicator color="#2C7BE5" style={styles.listLoading} /> : null
          }
        />
        <RewardExplanationModal linha={recompensaAberta} onClose={() => setRecompensaAberta(null)} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
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
        {isStale && atualizadoEm ? (
          <View style={styles.staleBanner} accessibilityLiveRegion="polite">
            <CloudOff size={16} color="#35506B" />
            <Text style={styles.staleText}>Atualizado às {formatClock(atualizadoEm)}</Text>
          </View>
        ) : null}

        {!resumo && isLoading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#2C7BE5" />
            <Text style={styles.supportingText}>Carregando seu progresso...</Text>
          </View>
        ) : null}

        {!resumo && !isLoading && errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.supportingText}>
              Não foi possível carregar seu progresso agora.
            </Text>
            <Pressable onPress={() => void refresh()} accessibilityRole="button" style={styles.retryButton}>
              <Text style={styles.retryText}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : null}

        {resumo ? (
          <>
            <Animated.View entering={FadeInDown.duration(260)}>
              <TodayCard hoje={resumo.hoje} onRetry={() => void refresh()} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(70).duration(260)}>
              <TrendCard
                periodo={resumo.periodo}
                streak={resumo.streak}
                tipo={periodo}
                onChangeTipo={setPeriodo}
                onRetry={() => void refresh()}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(140).duration(260)}>
              <AchievementsCard
                recentes={resumo.conquistasRecentes}
                todas={conquistas}
                onSeeAll={() => setView("conquistas")}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(210).duration(260)}>
              <RewardsCard
                nivel={resumo.nivel}
                xpTotal={resumo.xpTotal}
                recompensas={resumo.recompensasRecentes}
                onOpenReward={setRecompensaAberta}
                onSeeStatement={() => setView("extrato")}
              />
            </Animated.View>

            <View style={styles.disclaimer}>
              <Info size={14} color="#4F6982" />
              <Text style={styles.disclaimerText}>
                XP e conquistas acompanham seu uso do app. Elas não substituem a orientação da
                sua equipe de saúde.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <RewardExplanationModal linha={recompensaAberta} onClose={() => setRecompensaAberta(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  emptyCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#FDFEFF",
    gap: 10,
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
  emptyTitle: {
    color: "#12314C",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  supportingText: {
    color: "#35506B",
    fontSize: 14,
    lineHeight: 20,
  },
  staleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EEF2F6",
  },
  staleText: {
    color: "#35506B",
    fontSize: 13,
    fontWeight: "700",
  },
  loadingBlock: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FDFEFF",
    gap: 10,
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "#E8F2FF",
  },
  retryText: {
    color: "#1A5DB5",
    fontSize: 14,
    fontWeight: "700",
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  disclaimerText: {
    flex: 1,
    color: "#4F6982",
    fontSize: 12,
    lineHeight: 17,
  },
  subviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EEF5",
  },
  subviewTitle: {
    flex: 1,
    color: "#12314C",
    fontSize: 20,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    paddingTop: 8,
  },
  statementHeader: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 8,
  },
  statementList: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
  },
  separator: {
    height: 8,
  },
  listLoading: {
    marginVertical: 16,
  },
});
